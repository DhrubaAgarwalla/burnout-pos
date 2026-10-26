// Loads Burnout's printed menu into this POS: categories, dishes, the
// sheesha and tava roti versions, flavour / base / bread-extra options, and
// the tables with fresh QR tokens.
//
// menu.json comes from the menu site: `node scripts/export-menu-for-pos.mjs`
// in the burnout repo. On the VPS, from /docker/burnout-pos:
//   docker compose cp import-menu.cjs backend:/tmp/
//   docker compose cp menu.json backend:/tmp/
//   docker compose exec backend node /tmp/import-menu.cjs /tmp/menu.json
//
// Safe to run again: a branch whose menu already has categories keeps it,
// and tables that already exist are only given a QR token if they lack one.
'use strict';

const { readFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const { PrismaClient } = require(
  require.resolve('@prisma/client', { paths: [process.cwd()] }),
);

const MENU_SITE = (process.env.MENU_SITE || 'https://menu.srv1295557.hstgr.cloud').replace(/\/$/, '');
const TABLES = [
  ...Array.from({ length: 11 }, (_, i) => ({ number: String(i + 1), name: null })),
  { number: 'TA', name: 'Takeaway' },
];
const SPICE = { 1: 'MILD', 2: 'MEDIUM', 3: 'HOT' };
const qrToken = () => randomBytes(16).toString('hex');

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const branches = await prisma.branch.findMany();
  if (branches.length !== 1) throw new Error(`Expected one branch, found ${branches.length}`);
  const branch = branches[0];

  // Burnout's prices are before GST; 5% is added on the bill
  await prisma.branch.update({
    where: { id: branch.id },
    data: {
      taxMode: 'EXCLUSIVE',
      address: branch.address ?? data.settings.address,
      phone: branch.phone ?? data.settings.phone,
    },
  });

  const categories = await prisma.menuCategory.count({ where: { branchId: branch.id } });
  if (categories > 0) {
    console.log(`The menu already has ${categories} categories, so no dishes were imported.`);
  } else {
    await importMenu(branch.id, data);
  }
  await importTables(branch.id);
}

async function importMenu(branchId, data) {
  await prisma.$transaction(
    async (tx) => {
      const categoryId = new Map();
      for (const s of data.sections) {
        const c = await tx.menuCategory.create({
          data: { branchId, name: s.name, sortOrder: s.sort },
        });
        categoryId.set(s.slug, c.id);
      }

      // option groups with the same contents are made once and shared, so
      // "Extras" is one group on every bread rather than one per bread
      const groups = new Map();
      const groupFor = async (g) => {
        const key = JSON.stringify(g);
        if (!groups.has(key)) {
          const made = await tx.modifierGroup.create({
            data: {
              branchId,
              name: g.name,
              minSelect: g.min,
              maxSelect: g.max,
              isRequired: g.min > 0,
              modifiers: {
                create: g.modifiers.map((m, i) => ({
                  name: m.name,
                  priceAdjustment: m.price,
                  isDefault: Boolean(m.isDefault),
                  sortOrder: i + 1,
                })),
              },
            },
          });
          groups.set(key, made.id);
        }
        return groups.get(key);
      };

      for (const it of data.items) {
        const base = it.variants.length ? it.variants[0].price : it.price;
        const item = await tx.menuItem.create({
          data: {
            branchId,
            categoryId: categoryId.get(it.section),
            name: it.name,
            description: it.description,
            imageUrl: it.image ? MENU_SITE + it.image : null,
            price: base,
            taxRatePercent: data.settings.taxRate,
            isVeg: true,
            spiceLevel: SPICE[it.spice] ?? 'NONE',
            sortOrder: it.sort,
          },
        });
        // A dish sold in versions (Normal / Premium) gets a required
        // pick-one group first; the menu site shows that as version chips.
        const attached = it.variants.length
          ? [
              {
                name: `${it.name} type`,
                min: 1,
                max: 1,
                modifiers: it.variants.map((v, i) => ({
                  name: v.name,
                  price: v.price - base,
                  isDefault: i === 0,
                })),
              },
              ...it.groups,
            ]
          : it.groups;
        for (const [i, g] of attached.entries()) {
          await tx.menuItemModifierGroup.create({
            data: { menuItemId: item.id, modifierGroupId: await groupFor(g), sortOrder: i + 1 },
          });
        }
      }
      console.log(
        `Imported ${data.sections.length} categories, ${data.items.length} dishes, ${groups.size} option groups.`,
      );
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}

async function importTables(branchId) {
  let floor = await prisma.floor.findFirst({ where: { branchId }, orderBy: { sortOrder: 'asc' } });
  floor ??= await prisma.floor.create({ data: { branchId, name: 'Lounge' } });

  const existing = new Map(
    (await prisma.table.findMany({ where: { floorId: floor.id } })).map((t) => [t.number, t]),
  );
  let added = 0;
  for (const [i, t] of TABLES.entries()) {
    const had = existing.get(t.number);
    if (had) {
      if (!had.qrToken) {
        await prisma.table.update({ where: { id: had.id }, data: { qrToken: qrToken() } });
      }
      continue;
    }
    await prisma.table.create({
      data: {
        floorId: floor.id,
        number: t.number,
        name: t.name,
        capacity: 4,
        posX: 5 + (i % 6) * 15,
        posY: 10 + Math.floor(i / 6) * 30,
        qrToken: qrToken(),
      },
    });
    added++;
  }
  const tables = await prisma.table.findMany({
    where: { floorId: floor.id },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Tables: ${added} added, ${tables.length} on "${floor.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
