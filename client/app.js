// Initialize the SDK with your API key

async function searchHotels() {
	document.getElementById("loader").style.display = "block";

	// Clear previous hotel elements
	const hotelsDiv = document.getElementById("hotels");
	hotelsDiv.innerHTML = "";
	const errorDiv = document.getElementById("errorMessage");
	if (errorDiv) errorDiv.textContent = "";

	console.log("Searching for hotels...");
	const checkin = document.getElementById("checkin").value;
	const checkout = document.getElementById("checkout").value;
	const adultsValue = document.getElementById("adults").value;
	const city = document.getElementById("city").value;
	const countryCode = document.getElementById("countryCode").value;
	const environment = document.getElementById("environment").value;

	const checkinDate = new Date(checkin);
	const checkoutDate = new Date(checkout);
	const adults = parseInt(adultsValue, 10);

	if (!city || !countryCode || isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime()) || checkoutDate <= checkinDate || !Number.isFinite(adults) || adults < 1) {
		const message = !city || !countryCode
			? "Please enter city and country code."
			: (!Number.isFinite(adults) || adults < 1)
				? "Please enter a valid number of adults (>=1)."
				: "Please enter valid dates (checkout after checkin).";
		if (errorDiv) errorDiv.textContent = message;
		document.getElementById("loader").style.display = "none";
		return;
	}

	try {
		const params = new URLSearchParams({
			checkin,
			checkout,
			adults: String(adults),
			city,
			countryCode,
			environment,
		});

		const response = await fetch(`/search-hotels?${params.toString()}`);
		const rates = (await response.json()).rates;
		console.log(rates);
		displayRatesAndHotels(rates);

		document.getElementById("loader").style.display = "none";
	} catch (error) {
		console.error("Error fetching hotels:", error);
		if (errorDiv) errorDiv.textContent = "Failed to fetch hotels.";
		document.getElementById("loader").style.display = "none";
	}
}

function displayRatesAndHotels(rates) {
	const hotelsDiv = document.getElementById("hotels");

	rates.forEach((rate) => {
		if (!rate.roomTypes || rate.roomTypes.length === 0) return;

		const minRate = rate.roomTypes.reduce((min, current) => {
			const minAmount = min?.rates?.[0]?.retailRate?.total?.[0]?.amount ?? Number.POSITIVE_INFINITY;
			const currentAmount = current?.rates?.[0]?.retailRate?.total?.[0]?.amount ?? Number.POSITIVE_INFINITY;
			return minAmount < currentAmount ? min : current;
		});

		const retailTotal = minRate?.rates?.[0]?.retailRate?.total?.[0];
		const suggested = minRate?.rates?.[0]?.retailRate?.suggestedSellingPrice?.[0];
		const refundableTag = minRate?.rates?.[0]?.cancellationPolicies?.refundableTag;
		const boardType = minRate?.rates?.[0]?.boardType;
		const boardName = minRate?.rates?.[0]?.boardName;

		const imageUrl = rate?.hotel?.main_photo || 'https://via.placeholder.com/250?text=Hotel';
		const rateName = minRate?.rates?.[0]?.name || 'Rate';

		const hotelElement = document.createElement("div");
		hotelElement.innerHTML = `
		<div class='card-container'>
		<div class='card'>
			<div class='flex items-start'>
				<div class='card-image'>
					<img src='${imageUrl}' alt='hotel' />
				</div>
				<div class='flex-between-end w-full'>
					<div>
						<h4 class='card-title'>${rateName}</h4>
						<h3 class='card-id'>Hotel Name : ${rate?.hotel?.name || ''}</h3>
						<p class='featues'>
							Max Occupancy ∙ <span>${minRate?.rates?.[0]?.maxOccupancy ?? '-'}</span> Adult Count ∙
							<span>${minRate?.rates?.[0]?.adultCount ?? '-'}</span> Child Count ∙
							<span>${minRate?.rates?.[0]?.childCount ?? '-'}</span>
							Board Type ∙ <span>${boardType ?? '-'}</span> Board Name ∙
							<span>${boardName ?? '-'}</span>
						</p>
						<p class='flex items-center'>
							<span>${refundableTag === "NRFN" ? "Non refundable" : "Refundable"}</span>
						</p>
					</div>
					<p class='flex flex-col mb-0'>
		    			<span>${suggested ? `<s>${suggested.amount} ${suggested.currency}</s>` : ''}</span>
		   				<span class='price'>${retailTotal ? `${retailTotal.amount} ${retailTotal.currency}` : ''}</span>
		   				<button class='price-btn' onclick="proceedToBooking('${minRate.offerId}')">Book now</button>
					</p>
				</div>
			</div>
		</div>
	</div>
        `;

		hotelsDiv.appendChild(hotelElement);
	});
}

async function proceedToBooking(rateId) {
	console.log("Proceeding to booking for hotel ID:", rateId);

	// Clear existing HTML and display the loader
	const hotelsDiv = document.getElementById("hotels");
	const loader = document.getElementById("loader");
	hotelsDiv.innerHTML = "";
	loader.style.display = "block";

	// Create and append the form dynamically
	const formHtml = `
        <form id="bookingForm">
            <input type="hidden" name="prebookId" value="${rateId}">
            <label>Guest First Name:</label>
            <input type="text" name="guestFirstName" required><br>
            <label>Guest Last Name:</label>
            <input type="text" name="guestLastName" required><br>
            <label>Guest Email:</label>
            <input type="email" name="guestEmail" required><br><br>
            <label>Credit Card Holder Name:</label>
            <input type="text" name="holderName" required><br>
			<label>Voucher Code:</label>
            <input type="text" name="voucher"><br>
            <input type="submit" value="Book Now">
        </form>
    `;
	hotelsDiv.innerHTML = formHtml; // Insert the form into the 'hotels' div
	loader.style.display = "none";

	// Add event listener to handle form submission
	document.getElementById("bookingForm").addEventListener("submit", async function (event) {
		event.preventDefault();
		loader.style.display = "block";

		const formData = new FormData(event.target);
		const guestFirstName = formData.get('guestFirstName');
		const guestLastName = formData.get('guestLastName');
		const guestEmail = formData.get('guestEmail');
		const holderName = formData.get('holderName');
		const voucher = formData.get('voucher');
		const environment = document.getElementById("environment").value;

		try {
			// Include additional guest details in the payment processing request
			const bodyData = {
				environment,
				rateId
			};

			// Add voucher if it exists
			if (voucher) {
				bodyData.voucherCode = voucher;
			}
			console.log(bodyData);

			const prebookResponse = await fetch(`/prebook`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(bodyData),
			});

			const prebookData = await prebookResponse.json();
			console.log("preboook successful!", prebookData.success.data)
			// Assuming prebookData.success.data includes the necessary fields
			const paymentData = {
				currency: prebookData.success.data.currency,
				price: prebookData.success.data.price, // Ensure this field exists
				voucherTotalAmount: prebookData.success.data.voucherTotalAmount // Ensure this field exists or use a default if optional
			};
			displayPaymentInfo(paymentData);

			initializePaymentForm(
				prebookData.success.data.secretKey,
				prebookData.success.data.prebookId,
				prebookData.success.data.transactionId,
				guestFirstName,
				guestLastName,
				guestEmail
			);
		} catch (error) {
			console.error("Error in payment processing or booking:", error);
		} finally {
			loader.style.display = "none";
		}
	});
}

function displayPaymentInfo(data) {
	console.log("display payment data function called)")
	const paymentDiv = document.getElementById('hotels');
	if (!paymentDiv) {
		console.error('paymentInfo div not found');
		return;
	}
	// Destructure the necessary data from the object
	const { price, currency, voucherTotalAmount } = data;

	// Create content for the div
	let content = `<p>Amount: ${price} ${currency}</p>`;

	// Check if voucherTotalAmount is available and add it to the content
	if (voucherTotalAmount && voucherTotalAmount > 0) {
		content += `<p>Voucher Total Amount: ${voucherTotalAmount} ${currency}</p>`;
	}

	// Update the div's content
	paymentDiv.innerHTML = content;
}