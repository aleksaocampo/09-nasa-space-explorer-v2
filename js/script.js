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
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterBtn = document.getElementById('filterBtn');

// Cache the last fetched items so we can filter client-side without refetching
let lastFetchedItems = null;

// Helper: clear gallery and show a loading state
function showLoading() {
	// Insert spinner + loading text
	gallery.innerHTML = `
		<div class="placeholder" role="status" aria-live="polite">
			<div class="spinner" aria-hidden="true"></div>
			<p>Fetching images…</p>
		</div>
	`;
	// Mark the gallery as busy for accessibility
	gallery.setAttribute('aria-busy', 'true');
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

// Helper: fade current gallery then render new items
async function transitionToGallery(items) {
	const placeholder = gallery.querySelector('.placeholder');
	if (placeholder) {
		placeholder.classList.add('fade-out');
		await new Promise(r => setTimeout(r, 380));
	}
	buildGallery(items);
}

// Filter handler: uses lastFetchedItems to filter by date range
function applyFilter() {
	if (!lastFetchedItems) {
		gallery.innerHTML = '<div class="placeholder">No data loaded. Click "Fetch Space Images" first.</div>';
		return;
	}

	const startVal = startDateInput.value;
	const endVal = endDateInput.value;

	if (!startVal && !endVal) {
		// No filter; show all
		transitionToGallery(lastFetchedItems.filter(it => it.media_type === 'image'));
		return;
	}

	// Parse dates; APOD dates are in YYYY-MM-DD format
	let start = startVal ? new Date(startVal) : null;
	let end = endVal ? new Date(endVal) : null;

	if (start && end && start > end) {
		// Swap so range makes sense
		[start, end] = [end, start];
	}

	const filtered = lastFetchedItems.filter(it => {
		if (it.media_type !== 'image') return false;
		const d = new Date(it.date);
		if (start && d < start) return false;
		if (end && d > end) return false;
		return true;
	});

	if (!filtered.length) {
		gallery.innerHTML = '<div class="placeholder">No images match that date range.</div>';
		return;
	}

	transitionToGallery(filtered);
}

// Fetch data from the APOD JSON and render gallery
async function fetchAndShow() {
	// Save original button text so we can restore it
	const originalBtnText = getImageBtn.textContent;
	// minimum spinner time (ms) to make spinner visible even on fast networks
	const MIN_LOADING_MS = 1200;
	const start = Date.now();
	try {
		// Show loading state and disable the button to prevent duplicate clicks
		getImageBtn.disabled = true;
		getImageBtn.textContent = 'Loading…';
		showLoading();
		const res = await fetch(apodData);
		if (!res.ok) throw new Error('Network response was not ok');
		const data = await res.json();

		// The JSON is an object with keys — if it's an array, use directly
		const items = Array.isArray(data) ? data : Object.values(data);
		// Cache items for client-side filtering
		lastFetchedItems = items;

		// Ensure minimum spinner time so it doesn't flash too quickly
		const elapsed = Date.now() - start;
		const remaining = MIN_LOADING_MS - elapsed;
		if (remaining > 0) await new Promise(r => setTimeout(r, remaining));

		// Fade out the placeholder to create a smooth 'scene' change
		const placeholder = gallery.querySelector('.placeholder');
		if (placeholder) {
			placeholder.classList.add('fade-out');
			// Wait for the CSS fade duration (match 360ms in CSS)
			await new Promise(r => setTimeout(r, 380));
		}

		// Now render the gallery scene
		buildGallery(items);
	} catch (err) {
		// If an error occurred, still enforce the minimum spinner time and fade
		const elapsedErr = Date.now() - start;
		const remainingErr = MIN_LOADING_MS - elapsedErr;
		if (remainingErr > 0) await new Promise(r => setTimeout(r, remainingErr));
		const placeholder = gallery.querySelector('.placeholder');
		if (placeholder) {
			placeholder.classList.add('fade-out');
			await new Promise(r => setTimeout(r, 380));
		}
		gallery.innerHTML = `<div class="placeholder">Error loading images: ${err.message}</div>`;
		console.error('Fetch error:', err);
	} finally {
		// Restore button state and clear busy indicator
		getImageBtn.disabled = false;
		getImageBtn.textContent = originalBtnText || 'Fetch Space Images';
		gallery.removeAttribute('aria-busy');
	}
}

// Wire up button and modal interactions
getImageBtn.addEventListener('click', fetchAndShow);
// Wire up the filter button to apply the date filter
filterBtn.addEventListener('click', applyFilter);
// Allow pressing Enter in the date inputs to apply the filter
startDateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilter(); });
endDateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilter(); });
modalOverlay.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

// Accessibility: trap focus could be added, but keep simple for beginners