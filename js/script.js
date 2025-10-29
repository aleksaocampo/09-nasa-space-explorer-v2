// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Grab DOM elements we need
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// Helper: clear gallery and show a loading state
function showLoading() {
	gallery.innerHTML = '<div class="placeholder">Fetching images…</div>';
}

// Helper: open modal with provided data
function openModal(item) {
	modalImage.src = item.hdurl || item.url || '';
	modalImage.alt = item.title || 'NASA image';
	modalTitle.textContent = item.title || '';
	modalDate.textContent = item.date || '';
	modalExplanation.textContent = item.explanation || '';
	modal.classList.add('show');
	modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
	modal.classList.remove('show');
	modal.setAttribute('aria-hidden', 'true');
	// clear src to stop large image from staying in memory/bandwidth
	modalImage.src = '';
}

// Build gallery from fetched APOD array
function buildGallery(items) {
	// Filter to images only (APOD may contain videos)
	const images = items.filter(it => it.media_type === 'image');

	if (!images.length) {
		gallery.innerHTML = '<div class="placeholder">No images found.</div>';
		return;
	}

	// Create gallery item elements
	gallery.innerHTML = '';
	images.forEach(item => {
		const card = document.createElement('article');
		card.className = 'gallery-item';

		const img = document.createElement('img');
		img.src = item.url;
		img.alt = item.title || 'APOD image';

		const caption = document.createElement('p');
		caption.textContent = `${item.title} — ${item.date}`;

		card.appendChild(img);
		card.appendChild(caption);

		// On click open modal with full details
		card.addEventListener('click', () => openModal(item));

		gallery.appendChild(card);
	});
}

// Fetch data from the APOD JSON and render gallery
async function fetchAndShow() {
	try {
		showLoading();
		const res = await fetch(apodData);
		if (!res.ok) throw new Error('Network response was not ok');
		const data = await res.json();

		// The JSON is an object with keys — if it's an array, use directly
		const items = Array.isArray(data) ? data : Object.values(data);
		buildGallery(items);
	} catch (err) {
		gallery.innerHTML = `<div class="placeholder">Error loading images: ${err.message}</div>`;
		console.error('Fetch error:', err);
	}
}

// Wire up button and modal interactions
getImageBtn.addEventListener('click', fetchAndShow);
modalOverlay.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

// Accessibility: trap focus could be added, but keep simple for beginners