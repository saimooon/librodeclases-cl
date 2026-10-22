const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

// Corre una vez al día: marca como "expired" a los profesores cuyo trial venció
// y que no tienen una suscripción activa. La app también valida esto en el cliente
// (planStatus) y en firestore.rules, así que esta función es solo para mantener
// el campo `plan` consistente para reportes/analítica.
// TODO: cuando se integre Stripe (fase 2), agregar aquí el webhook de facturación
// (onRequest) que reciba eventos de checkout.session.completed / subscription.deleted.
exports.expireTrials = onSchedule('every 24 hours', async () => {
	const db = getFirestore();
	const now = Date.now();
	const snapshot = await db.collection('teachers').where('plan', '==', 'trial').where('trialEndsAt', '<=', now).get();
	const batch = db.batch();
	snapshot.forEach(doc => batch.update(doc.ref, { plan: 'expired' }));
	if (!snapshot.empty) await batch.commit();
});
