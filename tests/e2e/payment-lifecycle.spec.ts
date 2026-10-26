import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { starterIntakeQuestions } from '../../lib/intakeQuestions';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';

// Isolated fixtures; the webhook uses a local signature and never calls Stripe.
// playwright.config.ts gives only the local test server this synthetic secret.
const webhookSecret = 'whsec_e2e_only';

test.describe('payment lifecycle regressions', () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== 'phone-390', 'stateful flows run once');
  });

  test('returning to an owned trip as a guest preserves a paid status', async ({ page }) => {
    const db = new PrismaClient();
    const owner = await db.user.create({ data: {
      name: 'Paid organizer', email: `qa-owner-${crypto.randomUUID()}@example.com`,
      password: await bcrypt.hash('qa-password', 4), status: 'CONFIRMED_PAID',
    } });
    const trip = await db.trip.create({ data: { ownerId: owner.id, name: 'QA paid trip', isLocked: true, finalPrice: 100 } });
    await db.user.update({ where: { id: owner.id }, data: { tripId: trip.id } });
    try {
      await page.goto('/login');
      await page.locator('input[type=email]').fill(owner.email);
      await page.locator('input[type=password]').fill('qa-password');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/dashboard/);
      // Simulate the button on a previously loaded management page: another
      // tab may already have joined or completed payment in the meantime.
      await db.user.update({ where: { id: owner.id }, data: { tripId: null } });
      await page.goto(`/dashboard/my-trips/${trip.id}`);
      await db.user.update({ where: { id: owner.id }, data: { tripId: trip.id } });
      await page.getByRole('button', { name: /join as a guest/i }).click();
      await page.waitForURL(/\/dashboard$/);
      expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).status).toBe('CONFIRMED_PAID');
    } finally {
      await db.user.update({ where: { id: owner.id }, data: { tripId: null } });
      await db.trip.delete({ where: { id: trip.id } });
      await db.user.delete({ where: { id: owner.id } });
      await db.$disconnect();
    }
  });

  test('a refunded card payment stays refunded when Stripe replays completion', async ({ request }) => {
    const db = new PrismaClient();
    const user = await db.user.create({ data: {
      name: 'Webhook test guest', email: `qa-webhook-${crypto.randomUUID()}@example.com`,
      password: 'unused', status: 'PENDING_PAYMENT',
    } });
    const trip = await db.trip.create({ data: { name: 'QA webhook trip', isLocked: true, finalPrice: 100, depositAmount: 0 } });
    await db.user.update({ where: { id: user.id }, data: { tripId: trip.id } });
    const id = crypto.randomUUID();
    const completion = { id: `cs_qa_${id}`, status: 'complete', payment_status: 'paid', amount_total: 10000, payment_intent: `pi_qa_${id}`, metadata: { userId: user.id } };
    async function send(type: string, object: unknown) {
      const body = JSON.stringify({ id: `evt_qa_${crypto.randomUUID()}`, type, data: { object } });
      const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: webhookSecret });
      const response = await request.post('/api/webhooks/stripe', { data: body, headers: { 'stripe-signature': signature, 'content-type': 'application/json' } });
      expect(response.status(), await response.text()).toBe(200);
    }
    try {
      const unsigned = await request.post('/api/webhooks/stripe', { data: '{}' });
      expect(unsigned.status()).toBe(400);
      await send('checkout.session.completed', completion);
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe('CONFIRMED_PAID');
      await send('checkout.session.completed', completion);
      expect(await db.payment.count({ where: { userId: user.id } })).toBe(1);
      await send('charge.refunded', { payment_intent: completion.payment_intent, refunded: true });
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe('PENDING_PAYMENT');
      await send('checkout.session.completed', completion);
      expect((await db.payment.findUniqueOrThrow({ where: { stripeSessionId: completion.id } })).status).toBe('REFUNDED');
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe('PENDING_PAYMENT');
    } finally {
      await db.payment.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.trip.delete({ where: { id: trip.id } });
      await db.$disconnect();
    }
  });

  test('guest applies, submits intake, gets approved, and pays the chosen split with a private receipt', async ({ page, browser, request }) => {
    test.setTimeout(90_000);
    const db = new PrismaClient();
    const suffix = crypto.randomUUID();
    const password = await bcrypt.hash('qa-password', 4);
    const owner = await db.user.create({ data: { name: 'Lifecycle organizer', email: `qa-host-${suffix}@example.com`, password } });
    const guest = await db.user.create({ data: { name: 'Lifecycle guest', email: `qa-guest-${suffix}@example.com`, password } });
    const outsider = await db.user.create({ data: { name: 'Unrelated guest', email: `qa-other-${suffix}@example.com`, password } });
    const trip = await db.trip.create({ data: {
      ownerId: owner.id, name: 'QA lifecycle trip', inviteToken: `qa-${suffix}`, rosterCapacity: 1,
      housingPrice: 700, depositAmount: 20, venmoHandle: 'qa-only',
      disabledSections: ['transport', 'meals'], intakeQuestions: starterIntakeQuestions(),
    } });
    await db.user.update({ where: { id: outsider.id }, data: { tripId: trip.id, status: 'APPROVED' } });
    const guestContext = await browser.newContext();
    const outsiderContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const otherPage = await outsiderContext.newPage();
    async function login(p: typeof page, email: string) {
      await p.goto(new URL('/login', page.url()).toString());
      await p.locator('input[type=email]').fill(email);
      await p.locator('input[type=password]').fill('qa-password');
      await p.getByRole('button', { name: /sign in/i }).click();
      await p.waitForURL(/\/dashboard/);
    }
    try {
      await page.goto('/login');
      await login(page, owner.email);
      await login(guestPage, guest.email);
      await guestPage.goto(new URL(`/join/${trip.inviteToken}`, page.url()).toString());
      await guestPage.getByRole('button', { name: 'Apply to this trip', exact: true }).click();
      await expect(guestPage.getByText("You've applied.", { exact: true })).toBeVisible();
      await guestPage.getByRole('button', { name: 'Go to dashboard', exact: true }).click();
      await guestPage.waitForURL(/\/dashboard\/intake/);
      await guestPage.getByLabel('Phone number', { exact: false }).fill('5551234567');
      await guestPage.getByRole('button', { name: 'Submit for review', exact: true }).click();
      await expect.poll(() => db.guestForm.count({ where: { userId: guest.id, locked: true } })).toBe(1);
      await page.goto('/dashboard/my-trips');
      const applicant = page.locator('li').filter({ has: page.getByText(guest.email, { exact: true }) });
      await applicant.getByRole('button', { name: 'Approve', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'The trip is full' })).toBeVisible();
      await page.goto(`/dashboard/my-trips/${trip.id}`);
      await page.getByLabel('Number of roster spots').fill('2');
      await page.getByRole('button', { name: 'Save roster spots', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Roster spots saved.' })).toBeVisible();
      await page.goto('/dashboard/my-trips');
      await applicant.getByRole('button', { name: 'Approve', exact: true }).click();
      await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: guest.id } })).status).toBe('APPROVED');
      // Same guest session: approval must be reflected without signing in again.
      await guestPage.goto(new URL('/dashboard/payment', page.url()).toString());
      await expect(guestPage.getByText('Do not send money yet.', { exact: false })).toBeVisible();
      await page.goto(`/dashboard/my-trips/${trip.id}`);
      await page.getByLabel('Split costs between').fill('7');
      await page.getByRole('button', { name: 'Save split', exact: true }).click();
      await expect.poll(async () => (await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).costShareDivisor).toBe(7);
      await page.getByRole('button', { name: 'Lock', exact: true }).click();
      await expect.poll(async () => (await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).isLocked).toBe(true);
      expect((await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).finalPrice).toBe(100);
      await guestPage.reload();
      await expect(guestPage.getByRole('button', { name: 'Pay $120.00 by card', exact: true })).toBeVisible();
      await guestPage.getByRole('button', { name: 'Venmo', exact: true }).click();
      await expect(guestPage.getByLabel('Amount sent')).toHaveValue('120.00');
      await guestPage.getByLabel('Receipt screenshot').setInputFiles({
        name: 'qa-receipt.png', mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
      });
      await guestPage.getByRole('button', { name: 'I paid — tell the organizer', exact: true }).click();
      await expect.poll(() => db.payment.count({ where: { userId: guest.id, status: 'PENDING' } })).toBe(1);
      const payment = await db.payment.findFirstOrThrow({ where: { userId: guest.id } });
      expect(payment.amount).toBe(120);
      expect(payment.receiptUrl).toMatch(/^\/api\/files\//);
      const receipt = new URL(payment.receiptUrl!, page.url()).toString();
      expect((await guestPage.request.get(receipt)).status()).toBe(200);
      expect((await page.request.get(receipt)).status()).toBe(200);
      expect((await request.get(receipt)).status()).toBe(401);
      await login(otherPage, outsider.email);
      expect((await otherPage.request.get(receipt)).status()).toBe(404);
      await page.reload();
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: guest.id } })).status).toBe('CONFIRMED_PAID');
      await guestPage.reload();
      await expect(guestPage.getByRole('heading', { name: "You're in.", exact: true })).toBeVisible();
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: guest.id } })).status).toBe('PENDING_PAYMENT');
      await guestPage.reload();
      await expect(guestPage.getByRole('button', { name: 'Pay $120.00 by card', exact: true })).toBeVisible();
    } finally {
      await guestContext.close();
      await outsiderContext.close();
      await db.storedFile.deleteMany({ where: { tripId: trip.id } });
      await db.payment.deleteMany({ where: { userId: guest.id } });
      await db.guestForm.deleteMany({ where: { userId: guest.id } });
      await db.user.deleteMany({ where: { id: { in: [guest.id, outsider.id] } } });
      await db.trip.delete({ where: { id: trip.id } });
      await db.user.delete({ where: { id: owner.id } });
      await db.$disconnect();
    }
  });

});
