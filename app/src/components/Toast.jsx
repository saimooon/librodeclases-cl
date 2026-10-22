export default function Toast({ message }) {
	if (!message) return null;
	return (
		<div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-soft lg:bottom-6">
			{message}
		</div>
	);
}
