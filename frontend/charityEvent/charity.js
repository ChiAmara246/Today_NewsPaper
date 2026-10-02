let upcomingCharityData = [];
let latestCharityData = [];

let upcomingCharityPage = 1;
let latestCharityPage = 1;

const CHARITY_PER_PAGE = 6;


/* =====================================================
   LOAD CHARITY
===================================================== */

async function loadCharity() {

    const upcomingContainer =
        document.getElementById(
            "upcomingCharity"
        );

    const latestContainer =
        document.getElementById(
            "latestCharity"
        );


    if (
        !upcomingContainer ||
        !latestContainer
    ) {

        console.error(
            "Charity containers not found."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/charities`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        const charities =
            Array.isArray(
                data.charities
            )
                ? data.charities
                : [];


        /* =============================================
           TODAY
        ============================================= */

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        /* =============================================
           UPCOMING
           TODAY + FUTURE
           SOONEST FIRST
        ============================================= */

        upcomingCharityData =
            charities
                .filter(
                    charity => {

                        const date =
                            new Date(
                                charity.date
                            );

                        return (
                            !Number.isNaN(
                                date.getTime()
                            ) &&
                            date >= today
                        );

                    }
                )
                .sort(
                    (a, b) =>
                        new Date(a.date) -
                        new Date(b.date)
                );


        /* =============================================
           LATEST
           PAST
           MOST RECENT FIRST
        ============================================= */

        latestCharityData =
            charities
                .filter(
                    charity => {

                        const date =
                            new Date(
                                charity.date
                            );

                        return (
                            !Number.isNaN(
                                date.getTime()
                            ) &&
                            date < today
                        );

                    }
                )
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                );


        upcomingCharityPage =
            1;

        latestCharityPage =
            1;


        renderUpcomingCharity();

        renderLatestCharity();

        renderCharityHome(
            charities
        );


    } catch (error) {

        console.error(
            "Failed to load charity activities:",
            error
        );


        upcomingContainer.innerHTML = `
            <div class="charity-error">
                <p>
                    Unable to load upcoming activities.
                </p>
            </div>
        `;


        latestContainer.innerHTML = `
            <div class="charity-error">
                <p>
                    Unable to load latest activities.
                </p>
            </div>
        `;

    }

}






/* =====================================================
   OPEN DONATION FORM
===================================================== */

async function openDonationForm(activity) {

    /* =========================================
       CHECK FOR EXISTING PENDING DONATION
       ========================================= */

    const pendingReference =
        localStorage.getItem(
            "tnpPendingDonationReference"
        );


    if (pendingReference) {

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/donations/reference/${encodeURIComponent(
                        pendingReference
                    )}`
                );


            const data =
                await response.json();


            /*
             * EXISTING DONATION FOUND
             */

            if (
                response.ok &&
                data.exists &&
                data.donation
            ) {

                const donation =
                    data.donation;


                /*
                 * SAME CAMPAIGN
                 */

                if (
                    String(
                        donation.charityId
                    ) ===
                    String(
                        activity.id
                    )
                ) {

                    /*
                     * PAYMENT STAGE
                     */

                    if (
                        donation.donationStage ===
                        "payment"
                    ) {

                        showDonationPayment(
                            donation
                        );

                        return;

                    }


                    /*
                     * VERIFICATION STAGE
                     */

                    if (
                        donation.donationStage ===
                        "verification"
                    ) {

                        showDonationVerification(
                            donation
                        );

                        return;

                    }

                }


                /*
                 * DIFFERENT CAMPAIGN
                 *
                 * IMPORTANT:
                 * Do NOT delete the local reference.
                 *
                 * The donor may still have a valid
                 * pending donation for another campaign.
                 */

            } else {

                /*
                 * Backend explicitly says that the
                 * reference does not exist anymore.
                 *
                 * Only in this case do we remove it.
                 */

                localStorage.removeItem(
                    "tnpPendingDonationReference"
                );

            }


        } catch (error) {

            console.error(
                "Unable to check pending donation:",
                error
            );

            /*
             * Temporary lookup failure:
             *
             * Keep the reference.
             *
             * Do not prevent the donor from opening
             * the normal donation form.
             */

        }

    }


    let donationModal =
        document.getElementById(
            "donationModal"
        );


    /* =========================================
       CREATE MODAL
    ========================================= */

    if (!donationModal) {

        donationModal =
            document.createElement(
                "div"
            );


        donationModal.id =
            "donationModal";


        donationModal.className =
            "donation-modal";


        donationModal.innerHTML = `

            <div class="donation-modal-content">

                <button
                    type="button"
                    class="donation-close"
                    aria-label="Close"
                >
                    ×
                </button>


                <div class="donation-header">

                    <span class="donation-label">
                        SUPPORT THIS CHARITY WORK
                    </span>


                    <h2 class="donation-activity-title">
                        Make a Difference
                    </h2>


                    <p>
                        Your support helps us continue
                        this work and reach more people.
                    </p>


                    <div class="donation-countdown">

                        <span class="donation-countdown-label">
                            DONATIONS CLOSE IN
                        </span>


                        <strong
                            class="donation-countdown-time"
                        >
                            0d 0h 0min 0s
                        </strong>

                    </div>

                </div>


                <form class="donation-form">

                    <div class="donation-field">

                        <label>
                            Full Name
                        </label>


                        <input
                            type="text"
                            name="donorName"
                            placeholder="Enter your full name"
                            required
                        >

                    </div>


                    <div class="donation-field">

                        <label>
                            Email
                        </label>


                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            required
                        >

                    </div>


                    <div class="donation-field">

                        <label>
                            Phone
                        </label>


                        <input
                            type="tel"
                            name="phone"
                            id="donationPhone"
                            placeholder="Enter your phone number"
                        >

                    </div>


                    <div class="donation-field">

                        <label>
                            Message
                            <span>
                                (optional)
                            </span>
                        </label>


                        <textarea
                            name="message"
                            rows="4"
                            placeholder="Leave a message..."
                        ></textarea>

                    </div>


                    <div class="donation-field donation-consent">

                        <label class="donation-checkbox">
                            <input
                                type="checkbox"
                                name="showName"
                                checked
                            >
                            Show my name on the thank-you wall
                        </label>

                    </div>


                    <!-- =================================
                         DONATION AMOUNT
                    ================================== -->

                    <div class="donation-field">

                        <label>
                            Amount
                        </label>


                        <div class="donation-amount-row">

                            <span
                                class="donation-currency-symbol"
                            >
                                $
                            </span>


                            <input
                                type="number"
                                name="amount"
                                min="1"
                                step="0.01"
                                placeholder="Enter amount"
                                required
                            >

                        </div>

                    </div>


                    <!-- =================================
                         DONATION CURRENCY
                    ================================== -->

                    <div class="donation-field">

                        <label>
                            Currency
                        </label>


                        <select
                            name="currency"
                            required
                        ></select>

                    </div>


                    <button
                        type="submit"
                        class="donation-submit"
                    >
                        Continue to Checkout
                    </button>

                </form>

            </div>

        `;


        document.body.appendChild(
            donationModal
        );


        /* =========================================
           POPULATE CURRENCIES
        ========================================= */

        const currencySelect =
            donationModal.querySelector(
                'select[name="currency"]'
            );


        if (currencySelect) {

            populateDonationCurrencies(
                currencySelect
            );

        }


        /* =========================================
           INTERNATIONAL PHONE INPUT
        ========================================= */

        const phoneInput =
            donationModal.querySelector(
                "#donationPhone"
            );


        if (
            phoneInput &&
            typeof window.intlTelInput ===
                "function"
        ) {

            donationModal.phoneInput =
                window.intlTelInput(
                    phoneInput,
                    {

                        initialCountry:
                            "auto",


                        geoIpLookup:
                            function (
                                callback
                            ) {

                                fetch(
                                    "https://ipapi.co/json/"
                                )
                                    .then(
                                        response =>
                                            response.json()
                                    )
                                    .then(
                                        data => {

                                            callback(
                                                data.country_code
                                                    ? data.country_code.toLowerCase()
                                                    : "us"
                                            );

                                        }
                                    )
                                    .catch(
                                        () => {

                                            callback(
                                                "us"
                                            );

                                        }
                                    );

                            },


                        separateDialCode:
                            true,


                        preferredCountries: [
                            "ng",
                            "gh",
                            "za",
                            "ke",
                            "gb",
                            "us"
                        ],


                        utilsScript:
                            "https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js"

                    }
                );

        }


        /* =========================================
           CLOSE BUTTON
        ========================================= */

        const closeButton =
            donationModal.querySelector(
                ".donation-close"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                () => {

                    closeDonationModal(
                        donationModal
                    );

                }
            );

        }


        /* =========================================
           CLICK OUTSIDE
        ========================================= */

        donationModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    donationModal
                ) {

                    closeDonationModal(
                        donationModal
                    );

                }

            }
        );


        /* =========================================
           FORM SUBMIT
        ========================================= */

        const form =
            donationModal.querySelector(
                ".donation-form"
            );


        if (form) {

            form.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    /* =================================
                       GET FULL INTERNATIONAL NUMBER
                    ================================= */

                    if (
                        donationModal.phoneInput
                    ) {

                        const phoneNumber =
                            donationModal
                                .phoneInput
                                .getNumber();


                        const phoneField =
                            form.querySelector(
                                'input[name="phone"]'
                            );


                        if (
                            phoneField &&
                            phoneNumber
                        ) {

                            phoneField.value =
                                phoneNumber;

                        }

                    }


                    await submitDonation(
                        form,
                        activity,
                        donationModal
                    );

                }
            );

        }

    }


    /* =========================================
       UPDATE ACTIVITY
    ========================================= */

    const title =
        donationModal.querySelector(
            ".donation-activity-title"
        );


    if (title) {

        title.textContent =
            activity.activityHeadline ||
            "Make a Difference";

    }


    /* =========================================
       RESET FORM
    ========================================= */

    const form =
        donationModal.querySelector(
            ".donation-form"
        );


    if (form) {

        form.reset();

    }


    /* =========================================
       RESET CURRENCY
    ========================================= */

    const currencySelect =
        donationModal.querySelector(
            'select[name="currency"]'
        );


    if (currencySelect) {

        currencySelect.value =
            "USD";

    }


    /* =========================================
       RESET CURRENCY SYMBOL
    ========================================= */

    const currencySymbol =
        donationModal.querySelector(
            ".donation-currency-symbol"
        );


    if (currencySymbol) {

        currencySymbol.textContent =
            "$";

    }


    /* =========================================
       RESET PHONE
    ========================================= */

    if (
        donationModal.phoneInput
    ) {

        donationModal.phoneInput
            .setNumber(
                ""
            );

    }


    /* =========================================
       DONATION COUNTDOWN
       DONATIONS CLOSE 4 HOURS BEFORE ACTIVITY
    ========================================= */

    const countdownTime =
        donationModal.querySelector(
            ".donation-countdown-time"
        );


    if (countdownTime) {

        if (
            donationModal.countdownInterval
        ) {

            clearInterval(
                donationModal.countdownInterval
            );

        }


        const eventDate =
            new Date(
                activity.date
            );


        const donationCloseTime =
            new Date(
                eventDate.getTime() -
                (
                    4 *
                    60 *
                    60 *
                    1000
                )
            );


        const updateCountdown =
            function () {

                const now =
                    new Date();


                const remaining =
                    donationCloseTime.getTime() -
                    now.getTime();


                if (
                    remaining <= 0
                ) {

                    countdownTime.textContent =
                        "0d 0h 0min 0s";


                    clearInterval(
                        donationModal.countdownInterval
                    );


                    donationModal.countdownInterval =
                        null;


                    closeDonationModal(
                        donationModal
                    );


                    showDonationClosedPopup(
                        activity
                    );


                    return;

                }


                const totalSeconds =
                    Math.floor(
                        remaining /
                        1000
                    );


                const days =
                    Math.floor(
                        totalSeconds /
                        86400
                    );


                const hours =
                    Math.floor(
                        (
                            totalSeconds %
                            86400
                        ) /
                        3600
                    );


                const minutes =
                    Math.floor(
                        (
                            totalSeconds %
                            3600
                        ) /
                        60
                    );


                const seconds =
                    totalSeconds %
                    60;


                countdownTime.textContent =
                    `${days}d ${hours}h ${minutes}min ${seconds}s`;

            };


        updateCountdown();


        donationModal.countdownInterval =
            setInterval(
                updateCountdown,
                1000
            );

    }


    /* =========================================
       OPEN
    ========================================= */

    donationModal.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";

}

/* =====================================================
   CURRENCY SYMBOL
===================================================== */

function getCurrencySymbol(currencyCode) {

    try {

        const parts =
            new Intl.NumberFormat(
                "en",
                {
                    style: "currency",
                    currency: currencyCode,
                    currencyDisplay: "narrowSymbol"
                }
            ).formatToParts(0);


        const symbolPart =
            parts.find(
                part =>
                    part.type === "currency"
            );


        return symbolPart
            ? symbolPart.value
            : currencyCode;

    } catch (error) {

        return currencyCode;

    }

}

/* =====================================================
   POPULATE DONATION CURRENCIES
===================================================== */

function populateDonationCurrencies(currencySelect) {

    /*
     * Currencies accepted by Flutterwave.
     * Keep in sync with FLW_CURRENCIES in server.js.
     */

    const currencies = [

        "NGN",
        "USD",
        "EUR",
        "GBP",
        "CAD",
        "GHS",
        "KES",
        "UGX",
        "TZS",
        "RWF",
        "ZAR",
        "XAF",
        "XOF",
        "ZMW",
        "MWK",
        "EGP"

    ];


    let currencyNames = null;

    try {

        currencyNames =
            new Intl.DisplayNames(
                ["en"],
                {
                    type: "currency"
                }
            );

    } catch (error) {

        currencyNames = null;

    }


    currencySelect.innerHTML =
        currencies
            .map(code => {

                const name =
                    currencyNames
                        ? currencyNames.of(code)
                        : code;

                return `
                    <option value="${code}">
                        ${code} (${getCurrencySymbol(code)}) - ${name}
                    </option>
                `;

            })
            .join("");


    currencySelect.value =
        "USD";


    /* =========================================
       UPDATE SYMBOL ON CHANGE
    ========================================= */

    const donationForm =
        currencySelect.closest("form");


    const currencySymbol =
        donationForm
            ? donationForm.querySelector(
                ".donation-currency-symbol"
            )
            : null;


    currencySelect.addEventListener(
        "change",
        () => {

            if (currencySymbol) {

                currencySymbol.textContent =
                    getCurrencySymbol(
                        currencySelect.value
                    );

            }

        }
    );

}

/* =====================================================
   PAYMENT VERIFICATION
   Asks the backend to confirm the payment
   with Flutterwave.
===================================================== */

async function showDonationVerification(
    donation,
    transactionId = null
) {

    let popup =
        document.getElementById(
            "donationVerificationPopup"
        );


    if (!popup) {

        popup =
            document.createElement(
                "div"
            );


        popup.id =
            "donationVerificationPopup";


        popup.className =
            "donation-payment-popup";


        popup.innerHTML = `

            <div class="donation-modal-content">

                <button
                    type="button"
                    class="donation-close"
                    aria-label="Close"
                >
                    ×
                </button>


                <div class="donation-header">

                    <span class="donation-label">
                        PAYMENT VERIFICATION
                    </span>


                    <h2 class="donation-verification-title"></h2>


                    <p class="donation-verification-text"></p>

                </div>


                <div class="donation-payment-details">

                    <button
                        type="button"
                        class="donation-checkout-button donation-verification-button"
                    ></button>

                </div>

            </div>

        `;


        document.body.appendChild(
            popup
        );


        const closeVerification =
            () => {

                popup.classList.remove(
                    "active"
                );

                document.body.style.overflow =
                    "";

            };


        popup.querySelector(
            ".donation-close"
        ).addEventListener(
            "click",
            closeVerification
        );


        popup.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    popup
                ) {

                    closeVerification();

                }

            }
        );

    }


    const title =
        popup.querySelector(
            ".donation-verification-title"
        );


    const text =
        popup.querySelector(
            ".donation-verification-text"
        );


    const button =
        popup.querySelector(
            ".donation-verification-button"
        );


    const showState =
        (titleText, bodyText, buttonText, onClick) => {

            title.textContent =
                titleText;

            text.textContent =
                bodyText;

            button.style.display =
                buttonText ? "" : "none";

            button.textContent =
                buttonText || "";

            button.onclick =
                onClick || null;

        };


    showState(
        "Verifying your payment...",
        "Please wait while we confirm your payment with Flutterwave."
    );


    popup.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/donations/${encodeURIComponent(
                    donation.reference
                )}/verify`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        transactionId
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to verify payment."
            );

        }


        /* =========================================
           PAYMENT CONFIRMED
        ========================================= */

        if (
            data.paymentStatus ===
            "completed"
        ) {

            localStorage.removeItem(
                "tnpPendingDonationReference"
            );


            clearCharityReminder(
                data.donation.charityId
            );


            showState(
                "Thank you for your donation!",
                `Your payment of ${data.donation.currency} ${Number(
                    data.donation.amount
                ).toFixed(2)} has been confirmed.`,
                "Close",
                () => {

                    popup.classList.remove(
                        "active"
                    );

                    document.body.style.overflow =
                        "";

                }
            );

            return;

        }


        /* =========================================
           PAYMENT STILL PROCESSING
        ========================================= */

        if (
            data.paymentStatus ===
            "pending"
        ) {

            showState(
                "Payment is being confirmed",
                "Flutterwave has not confirmed your payment yet. Please check again in a moment.",
                "Check Again",
                () => showDonationVerification(
                    donation,
                    transactionId
                )
            );

            return;

        }


        /* =========================================
           PAYMENT NOT RECEIVED
        ========================================= */

        showState(
            "Payment not completed",
            "We could not confirm your payment. You can try again before your donation expires.",
            "Try Again",
            () => {

                popup.classList.remove(
                    "active"
                );

                showDonationPayment(
                    data.donation
                );

            }
        );

    } catch (error) {

        console.error(
            "Payment verification error:",
            error
        );


        showState(
            "Verification failed",
            "We could not reach the server. Please check again.",
            "Check Again",
            () => showDonationVerification(
                donation,
                transactionId
            )
        );

    }

}

/* =====================================================
   FLUTTERWAVE REDIRECT
   Flutterwave returns to this page with
   ?status=...&tx_ref=...&transaction_id=...
===================================================== */

function handleFlutterwaveRedirect() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const reference =
        params.get("tx_ref");


    if (!reference) {

        return;

    }


    const transactionId =
        params.get("transaction_id");


    /* Idea proposals () have their own confirmation */

    if (reference.startsWith("TNP-IDEA-")) {

        window.history.replaceState({}, "", window.location.pathname);

        showIdeaProposalVerification(reference, transactionId);

        return;
    }


    /*
     * Remove the payment details from the URL
     * so a page refresh does not verify again.
     */

    window.history.replaceState(
        {},
        "",
        window.location.pathname
    );


    showDonationVerification(
        {
            reference
        },
        transactionId
    );

}

/* =====================================================
   CLOSE DONATION MODAL
===================================================== */

function closeDonationModal(modal) {

    console.log(
    "closeDonationModal() CALLED"
);

    if (!modal) {
        return;
    }


    /* =========================================
       STOP COUNTDOWN
    ========================================= */

    if (
        modal.countdownInterval
    ) {

        clearInterval(
            modal.countdownInterval
        );

        modal.countdownInterval =
            null;

    }


    /* =========================================
       CLOSE MODAL
    ========================================= */

    modal.classList.remove(
        "active"
    );


    /* =========================================
       RESTORE PAGE SCROLL
    ========================================= */

    document.body.style.overflow =
        "";

}


/* =====================================================
   SUBMIT DONATION
===================================================== */


async function submitDonation(
    form,
    activity,
    donationModal
) {

    const submitButton =
        form.querySelector(
            ".donation-submit"
        );


    const formData =
        new FormData(form);


    const donorName =
        String(
            formData.get("donorName") || ""
        ).trim();


    const email =
        String(
            formData.get("email") || ""
        ).trim();


    const phone =
        String(
            formData.get("phone") || ""
        ).trim();


    const message =
        String(
            formData.get("message") || ""
        ).trim();


    const showName =
        formData.get("showName") === "on";


    const amount =
        Number(
            formData.get("amount")
        );


    const currency =
        String(
            formData.get("currency") || "USD"
        ).trim();


    /* =========================================
       BASIC VALIDATION
    ========================================= */

    if (
        !donorName ||
        !email
    ) {

        alert(
            "Please enter your full name and email address."
        );

        return;

    }


    if (
        !amount ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid donation amount."
        );

        return;

    }


    if (!currency) {

        alert(
            "Please select a currency."
        );

        return;

    }


    submitButton.disabled =
        true;

    submitButton.textContent =
        "Processing...";


    try {

        /* =========================================
           REQUEST PUSH NOTIFICATION PERMISSION
        ========================================= */

        const pushSubscription =
            await registerDonationPush();


        /* =========================================
           CREATE DONATION
        ========================================= */

        const response =
            await fetch(
                `${API_BASE_URL}/api/donations`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        charityId:
                            activity.id,

                        donorName:
                            donorName,

                        email:
                            email,

                        phone:
                            phone,

                        message:
                            message,

                        showName:
                            showName,

                        amount:
                            amount,

                        currency:
                            currency

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to create donation."
            );

        }


        console.log(
            "DONATION CREATED:",
            data
        );


        /* =========================================
           SAVE PENDING DONATION REFERENCE
        ========================================= */

        if (
            data.donation &&
            data.donation.reference
        ) {

            localStorage.setItem(
                "tnpPendingDonationReference",
                data.donation.reference
            );

        }


        /* =========================================
           ATTACH PUSH SUBSCRIPTION
        ========================================= */

        if (
            pushSubscription &&
            data.donation &&
            data.donation.reference
        ) {

            await attachDonationPush(
                data.donation.reference,
                pushSubscription
            );

        }


        /* =========================================
           CLOSE FORM
        ========================================= */

        closeDonationModal(
            donationModal
        );


        /* =========================================
           OPEN PAYMENT WINDOW
        ========================================= */

        showDonationPayment(
            data.donation
        );


        console.log(
            "PAYMENT POPUP OPENED"
        );


    } catch (error) {

        console.error(
            "Donation error:",
            error
        );


        alert(
            error.message ||
            "Unable to process your donation."
        );

    } finally {

        submitButton.disabled =
            false;

        submitButton.textContent =
            "Continue to Checkout";

    }

}



/* =====================================================
   PAYMENT INSTRUCTIONS
===================================================== */

function showDonationPayment(donation) {

    console.log(
        "showDonationPayment() CALLED",
        donation
    );


    let popup =
        document.getElementById(
            "donationPaymentPopup"
        );


    /* =========================================
       CREATE PAYMENT POPUP
    ========================================= */

    if (!popup) {

        popup =
            document.createElement(
                "div"
            );


        popup.id =
            "donationPaymentPopup";


        popup.className =
            "donation-payment-popup";


        popup.innerHTML = `

            <div class="donation-modal-content">

                <button
                    type="button"
                    class="donation-close"
                    aria-label="Close"
                >
                    ×
                </button>


                <div class="donation-header">

                    <span class="donation-label">
                        DONATION CREATED
                    </span>


                    <h2>
                        Complete Your Donation
                    </h2>


                    <p>
                        Your donation is ready.
                        Continue to secure checkout
                        to complete your payment.
                    </p>


                    <div class="donation-payment-countdown">

                        <span>
                            TIME REMAINING
                        </span>


                        <strong
                            class="donation-payment-countdown-time"
                        >
                            30:00
                        </strong>

                    </div>

                </div>


                <div class="donation-payment-details">

                    <p>
                        <strong>
                            Reference
                        </strong>
                    </p>


                    <p
                        class="donation-reference"
                    ></p>


                    <p>
                        <strong>
                            Amount
                        </strong>
                    </p>


                    <p
                        class="donation-amount"
                    ></p>


                    <p>
                        <strong>
                            Payment
                        </strong>
                    </p>


                    <p>
                        Secure checkout powered by
                        Flutterwave.
                    </p>


                    <button
                        type="button"
                        class="donation-checkout-button"
                    >
                        Continue to Checkout
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            popup
        );


        /* =========================================
           CLOSE BUTTON
        ========================================= */

        const closeButton =
            popup.querySelector(
                ".donation-close"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                () => {

                    popup.classList.remove(
                        "active"
                    );

                    document.body.style.overflow =
                        "";

                }
            );

        }


        /* =========================================
           CLICK OUTSIDE
        ========================================= */

        popup.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    popup
                ) {

                    popup.classList.remove(
                        "active"
                    );

                    document.body.style.overflow =
                        "";

                }

            }
        );


        /* =========================================
           CONTINUE TO CHECKOUT
        ========================================= */

        const checkoutButton =
            popup.querySelector(
                ".donation-checkout-button"
            );


        if (checkoutButton) {

            checkoutButton.addEventListener(
                "click",
                () => {

                    /*
                     * Use the donation currently shown,
                     * not the one from the first opening.
                     */

                    const currentDonation =
                        popup.currentDonation ||
                        donation;


                    console.log(
                        "OPENING FLUTTERWAVE CHECKOUT:",
                        currentDonation.reference
                    );


                    if (
                        currentDonation.checkoutUrl
                    ) {

                        window.location.href =
                            currentDonation.checkoutUrl;

                    } else {

                        alert(
                            "The payment checkout is not available yet. Please try again."
                        );

                    }

                }
            );

        }

    }


    popup.currentDonation =
        donation;


    /* =========================================
       DONATION REFERENCE
    ========================================= */

    const reference =
        popup.querySelector(
            ".donation-reference"
        );


    if (reference) {

        reference.textContent =
            donation.reference ||
            "Pending";

    }


    /* =========================================
       DONATION AMOUNT
    ========================================= */

    const amount =
        popup.querySelector(
            ".donation-amount"
        );


    if (amount) {

        const donationAmount =
            Number(
                donation.amount
            );


        const currency =
            donation.currency ||
            "USD";


        amount.textContent =
            `${currency} ${donationAmount.toFixed(2)}`;

    }


    /* =========================================
       CHECKOUT BUTTON
    ========================================= */

    const checkoutButton =
        popup.querySelector(
            ".donation-checkout-button"
        );


    if (checkoutButton) {

        checkoutButton.disabled =
            !donation.checkoutUrl;

        checkoutButton.textContent =
            donation.checkoutUrl
                ? "Continue to Checkout"
                : "Preparing Checkout...";

    }


    /* =========================================
       DONATION COUNTDOWN
       USE ORIGINAL expiresAt
    ========================================= */

    const countdownTime =
        popup.querySelector(
            ".donation-payment-countdown-time"
        );


    if (countdownTime) {

        if (
            popup.paymentCountdownInterval
        ) {

            clearInterval(
                popup.paymentCountdownInterval
            );

        }


        const updatePaymentCountdown =
            function () {

                const now =
                    Date.now();


                const expiresAt =
                    new Date(
                        donation.expiresAt
                    ).getTime();


                const remaining =
                    expiresAt -
                    now;


                if (
                    remaining <= 0
                ) {

                    countdownTime.textContent =
                        "00:00";


                    clearInterval(
                        popup.paymentCountdownInterval
                    );


                    popup.paymentCountdownInterval =
                        null;


                    popup.classList.remove(
                        "active"
                    );


                    document.body.style.overflow =
                        "";


                    return;

                }


                const totalSeconds =
                    Math.floor(
                        remaining /
                        1000
                    );


                const minutes =
                    Math.floor(
                        totalSeconds /
                        60
                    );


                const seconds =
                    totalSeconds %
                    60;


                countdownTime.textContent =
                    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

            };


        updatePaymentCountdown();


        popup.paymentCountdownInterval =
            setInterval(
                updatePaymentCountdown,
                1000
            );

    }


    /* =========================================
       OPEN PAYMENT POPUP
    ========================================= */

    popup.classList.add(
        "active"
    );


    console.log(
        "PAYMENT POPUP ACTIVE",
        new Date().toLocaleTimeString()
    );


    document.body.style.overflow =
        "hidden";

}

/* =====================================================
   DONATION CLOSED POPUP
===================================================== */

function showDonationClosedPopup(
    charity
) {

    const existingPopup =
        document.getElementById(
            "donationClosedPopup"
        );


    if (existingPopup) {

        existingPopup.remove();

    }


    const popup =
        document.createElement(
            "div"
        );


    popup.id =
        "donationClosedPopup";


    popup.className =
        "donation-closed-popup";


    popup.innerHTML = `

        <div class="donation-closed-popup-content">

            <button
                type="button"
                class="donation-closed-popup-close"
                aria-label="Close"
            >
                ×
            </button>


            <div class="donation-closed-popup-icon">
                <i class="fa-regular fa-heart"></i>
            </div>


            <h2>
                Donation Closed
            </h2>


            <p class="donation-closed-popup-message">
                Donations for this activity
                are now closed.
            </p>


            <p class="donation-closed-popup-activity">
                ${charity.activityHeadline || ""}
            </p>


            <button
                type="button"
                class="donation-closed-popup-button"
            >
                Close
            </button>

        </div>

    `;


    document.body.appendChild(
        popup
    );


    const closePopup =
        function () {

            popup.remove();

            document.body.style.overflow =
                "";

        };


    const closeButton =
        popup.querySelector(
            ".donation-closed-popup-close"
        );


    const okButton =
        popup.querySelector(
            ".donation-closed-popup-button"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closePopup
        );

    }


    if (okButton) {

        okButton.addEventListener(
            "click",
            closePopup
        );

    }


    popup.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                popup
            ) {

                closePopup();

            }

        }
    );


    document.body.style.overflow =
        "hidden";

}


async function registerDonationPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push notifications are not supported by this browser.");
        return null;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            console.warn("Notification permission was not granted.");
            return null;
        }

        const registration = await navigator.serviceWorker.ready;

        const existingSubscription =
            await registration.pushManager.getSubscription();

        if (existingSubscription) {
            return existingSubscription.toJSON();
        }

        const response = await fetch(
            `${API_BASE_URL}/api/push/public-key`
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve the push public key.");
        }

        const { publicKey } = await response.json();

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        return subscription.toJSON();

    } catch (error) {
        console.error("Push subscription failed:", error);
        return null;
    }
}

/* =====================================================
   CHARITY REMINDER
   The visitor chooses how often to be reminded.
   Reminders stop when donations close
   or when the visitor donates.
===================================================== */

const REMINDER_LABELS = {

    month: "Every month",
    week: "Every week",
    day: "Every day",
    "12h": "Every 12 hours",
    hour: "Every hour"

};


/*
 * Same rules as getAllowedReminderFrequencies
 * in server.js.
 */

function getReminderFrequencies(charity) {

    const HOUR =
        60 * 60 * 1000;

    const DAY =
        24 * HOUR;


    const remaining =
        new Date(charity.date).getTime() -
        4 * HOUR -
        Date.now();


    if (remaining >= 30 * DAY) {
        return ["month", "week", "day", "12h"];
    }

    if (remaining >= 7 * DAY) {
        return ["week", "day", "12h"];
    }

    if (remaining >= DAY) {
        return ["day", "12h", "hour"];
    }

    if (remaining > 0) {
        return ["hour"];
    }

    return [];

}


function getSavedReminder(charityId) {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    `tnpCharityReminder_${charityId}`
                )
            );

        /* Older saved reminders had no frequency */

        return saved && saved.frequency && saved.endpoint
            ? saved
            : null;

    } catch (error) {

        return null;

    }

}


function setReminderButtonState(
    reminderButton,
    isActive
) {

    if (!reminderButton) {
        return;
    }


    reminderButton.classList.toggle(
        "active",
        isActive
    );

    reminderButton.innerHTML =
        isActive
            ? `<i class="fa-solid fa-bell"></i>`
            : `<i class="fa-regular fa-bell"></i>`;

    const label =
        isActive
            ? "Reminder enabled"
            : "Set reminder";

    reminderButton.setAttribute(
        "aria-label",
        label
    );

    reminderButton.setAttribute(
        "title",
        label
    );

}


/*
 * Called after a confirmed donation:
 * the server already stopped the reminders.
 */

function clearCharityReminder(charityId) {

    localStorage.removeItem(
        `tnpCharityReminder_${charityId}`
    );


    document
        .querySelectorAll(
            `.charity-reminder[data-charity-id="${charityId}"]`
        )
        .forEach(button =>
            setReminderButtonState(
                button,
                false
            )
        );

}


function openReminderPicker(
    charity,
    reminderButton
) {

    const frequencies =
        getReminderFrequencies(charity);


    if (!frequencies.length) {

        showDonationClosedPopup(
            charity
        );

        return;

    }


    const saved =
        getSavedReminder(charity.id);


    const selected =
        saved &&
        frequencies.includes(saved.frequency)
            ? saved.frequency
            : frequencies[0];


    let popup =
        document.getElementById(
            "charityReminderPopup"
        );


    if (!popup) {

        popup =
            document.createElement(
                "div"
            );

        popup.id =
            "charityReminderPopup";

        popup.className =
            "donation-payment-popup";

        document.body.appendChild(
            popup
        );

    }


    popup.innerHTML = `

        <div class="donation-modal-content">

            <button
                type="button"
                class="donation-close"
                aria-label="Close"
            >
                ×
            </button>


            <div class="donation-header">

                <span class="donation-label">
                    DONATION REMINDER
                </span>

                <h2 class="charity-reminder-title"></h2>

                <p>
                    How often would you like to be reminded
                    until donations close?
                </p>

            </div>


            <form class="charity-reminder-form">

                <div class="charity-reminder-options">

                    ${frequencies.map(frequency => `
                        <label class="charity-reminder-option">
                            <input
                                type="radio"
                                name="frequency"
                                value="${frequency}"
                                ${frequency === selected ? "checked" : ""}
                            >
                            <span>${REMINDER_LABELS[frequency]}</span>
                        </label>
                    `).join("")}

                </div>


                <p class="charity-reminder-error" hidden></p>


                <button
                    type="submit"
                    class="donation-submit"
                >
                    ${saved ? "Update Reminder" : "Turn On Reminder"}
                </button>


                ${saved ? `
                    <button
                        type="button"
                        class="charity-reminder-off"
                    >
                        Turn Off Reminder
                    </button>
                ` : ""}

            </form>

        </div>

    `;


    popup.querySelector(
        ".charity-reminder-title"
    ).textContent =
        charity.activityHeadline;


    const errorText =
        popup.querySelector(
            ".charity-reminder-error"
        );


    const closePicker =
        () => {

            popup.classList.remove(
                "active"
            );

            document.body.style.overflow =
                "";

        };


    const showError =
        message => {

            errorText.textContent =
                message;

            errorText.hidden =
                false;

        };


    popup.querySelector(
        ".donation-close"
    ).addEventListener(
        "click",
        closePicker
    );


    popup.onclick =
        event => {

            if (event.target === popup) {
                closePicker();
            }

        };


    /* =========================================
       TURN ON / UPDATE
    ========================================= */

    const form =
        popup.querySelector(
            ".charity-reminder-form"
        );


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );

            submitButton.disabled =
                true;


            try {

                const frequency =
                    new FormData(form).get(
                        "frequency"
                    );


                const subscription =
                    await registerDonationPush();


                if (!subscription) {

                    throw new Error(
                        "Please allow notifications in your browser to receive reminders."
                    );

                }


                const response =
                    await fetch(
                        `${API_BASE_URL}/api/charities/${encodeURIComponent(charity.id)}/reminders`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                subscription,
                                frequency
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Unable to save your reminder."
                    );

                }


                localStorage.setItem(
                    `tnpCharityReminder_${charity.id}`,
                    JSON.stringify({
                        charityId:
                            charity.id,
                        frequency,
                        endpoint:
                            subscription.endpoint
                    })
                );


                setReminderButtonState(
                    reminderButton,
                    true
                );


                closePicker();

            } catch (error) {

                console.error(
                    "Unable to save charity reminder:",
                    error
                );

                showError(
                    error.message
                );

            } finally {

                submitButton.disabled =
                    false;

            }

        }
    );


    /* =========================================
       TURN OFF
    ========================================= */

    const offButton =
        popup.querySelector(
            ".charity-reminder-off"
        );


    if (offButton) {

        offButton.addEventListener(
            "click",
            async () => {

                offButton.disabled =
                    true;


                try {

                    const response =
                        await fetch(
                            `${API_BASE_URL}/api/charities/${encodeURIComponent(charity.id)}/reminders`,
                            {
                                method: "DELETE",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    endpoint:
                                        saved.endpoint
                                })
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            "Unable to turn off your reminder."
                        );

                    }


                    localStorage.removeItem(
                        `tnpCharityReminder_${charity.id}`
                    );


                    setReminderButtonState(
                        reminderButton,
                        false
                    );


                    closePicker();

                } catch (error) {

                    showError(
                        error.message
                    );

                } finally {

                    offButton.disabled =
                        false;

                }

            }
        );

    }


    popup.classList.add(
        "active"
    );

    document.body.style.overflow =
        "hidden";

}


async function attachDonationPush(reference, subscription) {
    if (!subscription || !reference) {
        return false;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/donations/${encodeURIComponent(reference)}/push-subscription`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    subscription
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Push subscription attachment failed: ${response.status}`
            );
        }

        return true;

    } catch (error) {
        console.error(
            "Unable to attach push subscription to donation:",
            error
        );

        return false;
    }
}
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat(
        (4 - (base64String.length % 4)) % 4
    );

    const base64 = (
        base64String +
        padding
    )
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);

    return Uint8Array.from(
        [...rawData].map(char => char.charCodeAt(0))
    );
}
/* =====================================================
   PAGINATION
===================================================== */

function renderCharityPagination(container, totalItems, currentPage, onPageChange) {

    const totalPages =
        Math.ceil(
            totalItems /
            CHARITY_PER_PAGE
        );


    if (totalPages <= 1) {
        return;
    }


    const pagination =
        document.createElement(
            "div"
        );


    pagination.className =
        "charity-pagination";


    /* =============================================
       PREVIOUS
    ============================================= */

    const prevButton =
        document.createElement(
            "button"
        );


    prevButton.type =
        "button";


    prevButton.className =
        "charity-page-button";


    prevButton.textContent =
        "Prev";


    prevButton.disabled =
        currentPage === 1;


    prevButton.addEventListener(
        "click",
        () => {

            if (
                currentPage > 1
            ) {

                onPageChange(
                    currentPage - 1
                );

            }

        }
    );


    /* =============================================
       CURRENT PAGE
    ============================================= */

    const currentButton =
        document.createElement(
            "button"
        );


    currentButton.type =
        "button";


    currentButton.className =
        "charity-page-button active";


    currentButton.textContent =
        currentPage;


    currentButton.disabled =
        true;


    /* =============================================
       NEXT
    ============================================= */

    const nextButton =
        document.createElement(
            "button"
        );


    nextButton.type =
        "button";


    nextButton.className =
        "charity-page-button";


    nextButton.textContent =
        "Next";


    nextButton.disabled =
        currentPage === totalPages;


    nextButton.addEventListener(
        "click",
        () => {

            if (
                currentPage <
                totalPages
            ) {

                onPageChange(
                    currentPage + 1
                );

            }

        }
    );


    pagination.appendChild(
        prevButton
    );


    pagination.appendChild(
        currentButton
    );


    pagination.appendChild(
        nextButton
    );


    container.appendChild(
        pagination
    );

}

/* =====================================================
   RENDER CHARITY CARDS
===================================================== */

function renderCharityCards(charities, container, showDonate) {

    if (!charities.length) {

        container.innerHTML = `
            <div class="charity-empty">
                <p>
                    No activities available.
                </p>
            </div>
        `;

        return;
    }


    charities.forEach(
        charity => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "charity-card";


            card.innerHTML = `

                <img
                    loading="lazy"
                    src="${getImagePath(
                        charity.img
                    )}"
                    alt="${charity.activityHeadline}"
                    class="charity-image"
                >


                ${
                    charity.label
                        ? `<span class="charity-tag">${escapeCharityHtml(charity.label)}</span>`
                        : ""
                }


                ${renderCharityDateBadge(
                    charity.date,
                    "charity-date-badge"
                )}


                <div class="charity-content">

                    <h2>
                        ${charity.activityHeadline}
                    </h2>


                    <div class="charity-bottom">

                        <p class="charity-date">
                            ${formatCharityDate(
                                charity.date
                            )}
                        </p>


                        ${
                            showDonate
                                ? `
                                    <div
                                        class="charity-actions"
                                    >

                                        <button
                                            type="button"
                                            class="charity-reminder"
                                            aria-label="Set reminder"
                                            title="Set reminder"
                                        >
                                            <i
                                                class="fa-regular fa-bell"
                                            ></i>
                                        </button>


                                        <button
                                            type="button"
                                            class="charity-donate"
                                        >
                                            ${escapeCharityHtml(
                                                getCharityCtaLabel(
                                                    charity
                                                )
                                            )}
                                        </button>

                                    </div>
                                  `
                                : ""
                        }

                    </div>

                </div>

            `;
            
            /* =============================================
            REMINDER
            ============================================= */

            const reminderButton =
                card.querySelector(
                    ".charity-reminder"
                );

            if (reminderButton) {

                reminderButton.dataset.charityId =
                    charity.id;

                /* Restore existing state */

                setReminderButtonState(
                    reminderButton,
                    Boolean(
                        getSavedReminder(
                            charity.id
                        )
                    )
                );

                reminderButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();
                        event.stopPropagation();

                        openReminderPicker(
                            charity,
                            reminderButton
                        );

                    }
                    );
                }

            /* =============================================
               DONATE
            ============================================= */

            if (showDonate) {

                const donateButton =
                    card.querySelector(
                        ".charity-donate"
                    );


                if (donateButton) {

                    donateButton.addEventListener(
                        "click",
                        function (event) {

                            event.stopPropagation();

                            if (
                                getCharityCtaType(
                                    charity
                                ) === "donate"
                            ) {

                                handleDonateClick(
                                    charity
                                );

                            } else {

                                window.location.href =
                                    getCharityDetailUrl(
                                        charity
                                    );

                            }

                        }
                    );

                }


            }


            /* =========================================
               OPEN DETAIL PAGE
               Click anywhere on the card.
            ========================================= */

            card.classList.add(
                "charity-card-link"
            );

            card.tabIndex = 0;

            card.setAttribute(
                "role",
                "link"
            );

            card.setAttribute(
                "aria-label",
                `View details: ${charity.activityHeadline}`
            );


            const openDetail =
                function () {

                    window.location.href =
                        getCharityDetailUrl(
                            charity
                        );

                };


            card.addEventListener(
                "click",
                openDetail
            );


            card.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.target === card &&
                        event.key === "Enter"
                    ) {

                        openDetail();

                    }

                }
            );


            container.appendChild(
                card
            );

        }
    );

}

/* =====================================================
   DONATE CLICK
   Shared by the cards and the detail page.
===================================================== */

function handleDonateClick(charity) {

    const eventDate =
        new Date(
            charity.date
        );


    if (
        Number.isNaN(
            eventDate.getTime()
        )
    ) {

        console.error(
            "Invalid charity event date:",
            charity.date
        );

        return;
    }


    /*
       Donations close
       exactly 4 hours
       before the activity.
    */

    const donationCloseTime =
        new Date(
            eventDate.getTime() -
            (
                4 *
                60 *
                60 *
                1000
            )
        );


    if (
        new Date() >=
        donationCloseTime
    ) {

        showDonationClosedPopup(
            charity
        );

        return;

    }


    openDonationForm(
        charity
    );

}


/* =====================================================
   CHARITY DETAIL PAGES
   upcomingWork.html?id=<charity id>  (today and future)
   latestWork.html?id=<charity id>    (past)
===================================================== */

function isUpcomingCharity(charity) {

    const today =
        new Date();

    today.setHours(0, 0, 0, 0);


    return new Date(charity.date) >= today;

}


function getCharityDetailUrl(charity) {

    const page =
        isUpcomingCharity(charity)
            ? "upcomingWork.html"
            : "latestWork.html";


    return `${page}?id=${encodeURIComponent(
        charity.id
    )}`;

}


function escapeCharityHtml(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


async function loadCharityDetail(container, render = renderCharityDetail) {

    const charityId =
        new URLSearchParams(
            window.location.search
        ).get("id");


    if (!charityId) {

        renderCharityDetailError(
            container,
            "No activity was selected."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/charities/${encodeURIComponent(
                    charityId
                )}`
            );


        if (response.status === 404) {

            renderCharityDetailError(
                container,
                "This activity could not be found."
            );

            return;
        }


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        render(
            container,
            data.charity
        );

    } catch (error) {

        console.error(
            "Failed to load charity activity:",
            error
        );

        renderCharityDetailError(
            container,
            "Unable to load this activity. Please try again later."
        );

    }

}


function renderCharityDetailError(container, message) {

    container.innerHTML = `
        <div class="charity-error">
            <p>${escapeCharityHtml(message)}</p>
        </div>
        <a class="cw-back" href="charityEvents.html">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
            All charity events
        </a>
    `;

}


function formatCharityMoney(amount, currency) {

    try {

        return new Intl.NumberFormat(
            "en-NG",
            {
                style: "currency",
                currency: currency || "NGN",
                maximumFractionDigits: 0
            }
        ).format(
            Number(amount) || 0
        );

    } catch {

        return `${currency || ""} ${Number(amount) || 0}`.trim();

    }

}


/* =====================================================
   STAGES — before • today • after
===================================================== */

function getCharityDay(date) {

    const day =
        new Date(date);

    day.setHours(0, 0, 0, 0);

    return day;

}


function getCharityStage(date) {

    const eventDate =
        new Date(date);


    if (Number.isNaN(eventDate.getTime())) {
        return "before";
    }


    const eventDay =
        getCharityDay(eventDate);


    const today =
        getCharityDay(new Date());


    if (eventDay > today) {
        return "before";
    }


    return eventDay.getTime() === today.getTime()
        ? "today"
        : "after";

}


function getCharityDaysLeft(date) {

    return Math.round(
        (getCharityDay(date) - getCharityDay(new Date())) /
        (24 * 60 * 60 * 1000)
    );

}


function formatCharityLongDate(date) {

    const value =
        new Date(date);


    return Number.isNaN(value.getTime())
        ? "Date to be announced"
        : value.toLocaleDateString(
            "en-NG",
            { weekday: "long", day: "numeric", month: "long", year: "numeric" }
        );

}


function renderCharityDateBadge(date, className) {

    const value =
        new Date(date);


    if (Number.isNaN(value.getTime())) {
        return "";
    }


    return `
        <span class="${className}" aria-hidden="true">
            <span class="${className}-day">${value.getDate()}</span>
            <span class="${className}-month">${escapeCharityHtml(
                value.toLocaleDateString("en-NG", { month: "short" })
            )}</span>
        </span>
    `;

}


/* =====================================================
   MAIN BUTTON
   One button, same text on the card, hero and panel.
===================================================== */

function getCharityCtaType(charity) {

    const type =
        charity.cta && charity.cta.type;


    return ["register", "donate", "contact"].includes(type)
        ? type
        : "donate";

}


function getCharityCtaLabel(charity) {

    return (
        (charity.cta && charity.cta.label) ||
        {
            register: "Register",
            donate: "Support this cause",
            contact: "Contact us"
        }[getCharityCtaType(charity)]
    );

}


function getCharityCtaHref(charity) {

    const organiser =
        charity.organiser || {};


    if (charity.cta && charity.cta.url) {
        return charity.cta.url;
    }


    return getCharityCtaType(charity) === "contact" && organiser.email
        ? `mailto:${organiser.email}`
        : "";

}


function renderCharityCtaButton(charity, className) {

    const type =
        getCharityCtaType(charity);


    const href =
        getCharityCtaHref(charity);


    const label =
        escapeCharityHtml(getCharityCtaLabel(charity));


    if (type === "donate" || !href) {

        return `<button type="button" class="${className}" data-action="cta">${label}</button>`;

    }


    const external =
        /^https?:/.test(href)
            ? ' target="_blank" rel="noopener noreferrer"'
            : "";


    return `<a class="${className}" href="${escapeCharityHtml(href)}"${external}>${label}</a>`;

}


function getCharityFundraising(charity) {

    const fundraising =
        charity.fundraising;


    if (!fundraising || !(Number(fundraising.goal) > 0)) {
        return null;
    }


    const raised =
        Number(fundraising.raised) || 0;


    const goal =
        Number(fundraising.goal);


    return {
        raised,
        goal,
        currency: fundraising.currency || "NGN",
        updatedAt: fundraising.updatedAt || "",
        percent: Math.round(raised / goal * 100)
    };

}


function renderCharityList(value, fallback) {

    const paragraphs =
        Array.isArray(value)
            ? value
            : value
                ? [value]
                : [];


    return paragraphs.length
        ? paragraphs.map(text => `<p>${escapeCharityHtml(text)}</p>`).join("")
        : fallback;

}


function renderCharityPartners(charity, className) {

    const partners =
        Array.isArray(charity.partners)
            ? charity.partners.filter(partner => partner && (partner.name || partner.logo))
            : [];


    if (!partners.length) {
        return "";
    }


    return `
        <ul class="${className}">
            ${partners.map(partner => `
                <li title="${escapeCharityHtml(partner.name)}">
                    ${partner.logo
                        ? `<img src="${escapeCharityHtml(getImagePath(partner.logo))}" alt="${escapeCharityHtml(partner.name)}" loading="lazy">`
                        : `<span>${escapeCharityHtml(partner.name)}</span>`}
                </li>
            `).join("")}
        </ul>
    `;

}


function bindCharityHeroFallback(container, heroSelector, bannerClass) {

    const hero =
        container.querySelector(heroSelector);


    const image =
        hero && hero.querySelector("img");


    if (!image) {
        return;
    }


    image.addEventListener(
        "error",
        function () {

            image.remove();

            hero.classList.add(bannerClass);

        }
    );

}


function bindCharityActions(container, charity) {

    container
        .querySelectorAll("[data-action]")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const action =
                        button.dataset.action;


                    if (action === "calendar") {

                        downloadCharityCalendar(charity);

                    } else if (
                        action === "donate" ||
                        getCharityCtaType(charity) === "donate"
                    ) {

                        handleDonateClick(charity);

                    } else {

                        container
                            .querySelector(".uw-questions, .cw-organiser")
                            ?.scrollIntoView({ behavior: "smooth" });

                    }

                }
            );

        });

}


/* =====================================================
   LATEST WORK PAGE — the campaign story
   latestWork.html?id=<charity id>
===================================================== */

/* Donor name colours (amounts in the campaign currency) */

const DONOR_TIER_GOLD = 100000;
const DONOR_TIER_SILVER = 25000;

const PILE_PHOTOS = 4;


function asCharityArray(value) {

    return Array.isArray(value)
        ? value.filter(Boolean)
        : value
            ? [value]
            : [];

}


function getCharityGallery(charity) {

    return asCharityArray(charity.gallery)
        .map(item =>
            typeof item === "string"
                ? { img: item, caption: "" }
                : { img: item.img, caption: item.caption || "" }
        )
        .filter(item => item.img);

}


function getCharityInitials(name) {

    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");

}


function formatCharityShortDate(date) {

    const value =
        new Date(date);


    return Number.isNaN(value.getTime())
        ? ""
        : value.toLocaleDateString(
            "en-NG",
            { day: "numeric", month: "short", year: "numeric" }
        );

}


function renderCharityDetail(container, charity) {

    if (getCharityStage(charity.date) !== "after") {

        window.location.replace(
            `upcomingWork.html?id=${encodeURIComponent(charity.id)}`
        );

        return;
    }


    const e =
        escapeCharityHtml;


    document.title =
        `${charity.activityHeadline} | Today Newspaper`;


    const organiser =
        charity.organiser || {};


    const fundraising =
        getCharityFundraising(charity);


    const currency =
        fundraising ? fundraising.currency : "NGN";


    const results =
        charity.results || {};


    const gallery =
        getCharityGallery(charity);


    const shareUrl =
        getCharityShareUrl(charity);


    /* ---------- Hero: photo pile ---------- */

    const pile =
        gallery.slice(0, PILE_PHOTOS);


    const pileHtml =
        pile.length
            ? `
                <div class="lw-pile" role="group" aria-label="Photos from this campaign">
                    ${pile.slice().reverse().map((item, i) => {

                        const index = pile.length - 1 - i;

                        return `
                            <button type="button" class="lw-pile-photo lw-pile-photo--${index}" data-photo="${index}" aria-label="Open photo ${index + 1} of ${gallery.length}">
                                <img src="${e(getImagePath(item.img))}" alt="${e(item.caption)}" loading="${index === 0 ? "eager" : "lazy"}">
                            </button>
                        `;

                    }).join("")}
                    ${gallery.length > pile.length ? `<span class="lw-pile-count">+${gallery.length - pile.length} photos</span>` : ""}
                </div>
              `
            : `
                <div class="lw-pile lw-pile--empty" aria-hidden="true">
                    <i class="fa-solid fa-heart"></i>
                </div>
              `;


    /* ---------- Results ---------- */

    const stats =
        asCharityArray(results.stats)
            .filter(stat => stat.value !== undefined && stat.value !== "");


    const raisedHtml =
        fundraising && fundraising.raised > 0
            ? `
                <div class="lw-stat lw-stat--main">
                    <strong>${e(formatCharityMoney(fundraising.raised, currency))}</strong>
                    <span>raised</span>
                </div>
              `
            : "";


    const statsHtml =
        stats.map(stat => `
            <div class="lw-stat">
                <strong>${e(stat.value)}</strong>
                <span>${e(stat.label)}</span>
            </div>
        `).join("");


    const goalHtml =
        fundraising
            ? `
                <div class="lw-goal">
                    <div class="lw-goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, fundraising.percent)}" aria-label="Fundraising goal">
                        <span style="width: ${Math.min(100, fundraising.percent)}%"></span>
                    </div>
                    <p>
                        <strong>${fundraising.percent}%</strong>
                        of the ${e(formatCharityMoney(fundraising.goal, currency))} goal
                    </p>
                    ${fundraising.percent >= 100 ? `<span class="lw-stamp">Goal reached 🎉</span>` : ""}
                </div>
              `
            : "";


    const impact =
        asCharityArray(results.impact);


    const impactHtml =
        impact.length
            ? `
                <div class="lw-impact">
                    <h3>What your money did</h3>
                    <ul>
                        ${impact.map(item => `<li><i class="fa-solid fa-check" aria-hidden="true"></i>${e(item)}</li>`).join("")}
                    </ul>
                </div>
              `
            : "";


    const spending =
        asCharityArray(results.spending)
            .filter(item => Number(item.percent) > 0);


    const spendingHtml =
        spending.length
            ? `
                <div class="lw-spending">
                    <h3>Where the money went</h3>
                    <div class="lw-spending-bar" role="img" aria-label="${e(spending.map(item => `${item.label} ${item.percent}%`).join(", "))}">
                        ${spending.map((item, i) => `<span class="lw-spend-${i % 5}" style="width: ${Number(item.percent)}%"></span>`).join("")}
                    </div>
                    <ul class="lw-spending-legend">
                        ${spending.map((item, i) => `
                            <li><span class="lw-spend-${i % 5}" aria-hidden="true"></span>${e(item.label)} <strong>${Number(item.percent)}%</strong></li>
                        `).join("")}
                    </ul>
                </div>
              `
            : "";


    const reportHtml =
        results.reportUrl
            ? `
                <a class="lw-report" href="${e(getCharityFileUrl(results.reportUrl))}" target="_blank" rel="noopener noreferrer" download>
                    <i class="fa-regular fa-file-pdf" aria-hidden="true"></i>
                    Download the full report (PDF)
                </a>
              `
            : "";


    const resultsHtml =
        raisedHtml || statsHtml || goalHtml || impactHtml || spendingHtml
            ? `
                <section class="cw-section lw-results">
                    <h2>Campaign results</h2>
                    ${raisedHtml || statsHtml ? `<div class="lw-stats">${raisedHtml}${statsHtml}</div>` : ""}
                    ${goalHtml}
                    ${impactHtml || spendingHtml ? `<div class="lw-results-grid">${impactHtml}${spendingHtml}</div>` : ""}
                    ${reportHtml}
                </section>
              `
            : "";


    /* ---------- Story: before → during → after ---------- */

    const story =
        charity.story || {};


    const steps = [
        ["before", "Before"],
        ["during", "On the day"],
        ["after", "After"]
    ].filter(([key]) => asCharityArray(story[key]).length);


    const storyHtml =
        steps.length
            ? `
                <section class="cw-section">
                    <h2>The story</h2>
                    <ol class="lw-story">
                        ${steps.map(([key, label]) => `
                            <li>
                                <span class="lw-story-label">${label}</span>
                                <div class="cw-description">${renderCharityList(story[key], "")}</div>
                            </li>
                        `).join("")}
                    </ol>
                </section>
              `
            : `
                <section class="cw-section">
                    <h2>${asCharityArray(charity.recap).length ? "The story" : "About this campaign"}</h2>
                    <div class="cw-description">
                        ${renderCharityList(
                            asCharityArray(charity.recap).length ? charity.recap : charity.description,
                            "<p>The full story of this campaign will be published soon.</p>"
                        )}
                    </div>
                </section>
              `;


    /* ---------- Testimonials ---------- */

    const testimonials =
        asCharityArray(charity.testimonials)
            .filter(item => item.quote);


    const testimonialsHtml =
        testimonials.length
            ? `
                <section class="cw-section">
                    <h2>In their words</h2>
                    <div class="lw-quotes">
                        ${testimonials.map(item => `
                            <figure class="lw-quote">
                                <blockquote>“${e(item.quote)}”</blockquote>
                                <figcaption>
                                    <strong>${e(item.name)}</strong>
                                    ${item.role ? `<span>${e(item.role)}</span>` : ""}
                                </figcaption>
                            </figure>
                        `).join("")}
                    </div>
                </section>
              `
            : "";


    /* ---------- Before / after slider ---------- */

    const beforeAfter =
        charity.beforeAfter;


    const beforeAfterHtml =
        beforeAfter && beforeAfter.before && beforeAfter.after
            ? `
                <section class="cw-section">
                    <h2>Before &amp; after</h2>
                    <div class="lw-compare" style="--lw-pos: 50%">
                        <img src="${e(getImagePath(beforeAfter.after))}" alt="After" loading="lazy">
                        <div class="lw-compare-before">
                            <img src="${e(getImagePath(beforeAfter.before))}" alt="Before" loading="lazy">
                        </div>
                        <span class="lw-compare-tag lw-compare-tag--before">Before</span>
                        <span class="lw-compare-tag lw-compare-tag--after">After</span>
                        <span class="lw-compare-handle" aria-hidden="true"></span>
                        <input type="range" min="0" max="100" value="50" aria-label="Compare before and after">
                    </div>
                    ${beforeAfter.caption ? `<p class="lw-caption">${e(beforeAfter.caption)}</p>` : ""}
                </section>
              `
            : "";


    /* ---------- Thank you: sponsors (logos) ---------- */

    const sponsors =
        asCharityArray(charity.partners)
            .filter(item => item.name || item.logo)
            .sort((a, b) => Number(Boolean(b.main)) - Number(Boolean(a.main)));


    const sponsorsHtml =
        sponsors.length
            ? `
                <div class="lw-ticker-sponsors">
                    <span class="lw-ticker-label"><i class="fa-solid fa-handshake" aria-hidden="true"></i>Sponsors</span>
                    <ul class="lw-sponsors">
                        ${sponsors.map(item => {

                            const inner = `
                                <span class="lw-sponsor-logo">
                                    ${item.logo
                                        ? `<img src="${e(getImagePath(item.logo))}" alt="${e(item.name)}" loading="lazy">`
                                        : `<span>${e(item.name)}</span>`}
                                </span>
                                ${item.contribution ? `<span class="lw-sponsor-note">${e(item.contribution)}</span>` : ""}
                            `;

                            return `
                                <li class="${item.main ? "lw-sponsor--main" : ""}" title="${e(item.name)}">
                                    ${item.url
                                        ? `<a href="${e(item.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
                                        : inner}
                                </li>
                            `;

                        }).join("")}
                    </ul>
                </div>
              `
            : "";


    /* ---------- Thank you: donors + volunteers ticker ---------- */

    const renderThanks = donorList => {

    const donors =
        donorList
            .filter(item => item.name || item.anonymous);


    const volunteers =
        asCharityArray(charity.volunteers)
            .filter(item => item.name);


    const donorTier = amount =>
        amount >= DONOR_TIER_GOLD
            ? "gold"
            : amount >= DONOR_TIER_SILVER
                ? "silver"
                : "";


    const donorName = item =>
        item.anonymous ? "Anonymous" : item.name;


    /* A thank-you note written by someone who was helped */

    const thanksNote = item => {

        const thanks =
            item.thanks || {};


        if (!thanks.text) {
            return "";
        }


        const signature =
            [thanks.from, thanks.age ? `${thanks.age}` : ""]
                .filter(Boolean)
                .join(", ");


        return `
            <blockquote class="lw-note-text">${e(thanks.text)}</blockquote>
            ${signature ? `<p class="lw-note-from">— ${e(signature)}</p>` : ""}
        `;

    };


    const tickerItem = ({ kind, tier, name, meta, note }) => `
        <li class="lw-note lw-note--${kind}${tier ? ` lw-note--${tier}` : ""}">
            <p class="lw-note-to">
                <span aria-hidden="true">${kind === "donor" ? "❤" : "✦"}</span>
                <strong>${e(name)}</strong>
                <span>${e(meta)}</span>
            </p>
            ${note}
        </li>
    `;


    const tickerDonors =
        donors.map(item => {

            const amount = Number(item.amount) || 0;

            return tickerItem({
                kind: "donor",
                tier: donorTier(amount),
                name: donorName(item),
                meta: amount > 0 ? formatCharityMoney(amount, item.currency || currency) : "Donor",
                note: thanksNote(item)
            });

        });


    const tickerVolunteers =
        volunteers.map(item =>
            tickerItem({
                kind: "volunteer",
                name: item.name,
                meta: item.role ? `Volunteer · ${item.role}` : "Volunteer",
                note: thanksNote(item)
            })
        );


    /* Mix donors and volunteers: 2 donors, 1 volunteer, … */

    const tickerItems = [];

    let donorIndex = 0;

    let volunteerIndex = 0;


    while (
        donorIndex < tickerDonors.length ||
        volunteerIndex < tickerVolunteers.length
    ) {

        tickerItems.push(
            ...tickerDonors.slice(donorIndex, donorIndex + 2)
        );

        donorIndex += 2;


        if (volunteerIndex < tickerVolunteers.length) {

            tickerItems.push(
                tickerVolunteers[volunteerIndex]
            );

            volunteerIndex += 1;

        }

    }


    const tickerHtml =
        tickerItems.length
            ? `
                <div class="lw-ticker" tabindex="0" aria-label="Donors and volunteers">
                    <span class="lw-ticker-label lw-ticker-label--strip">
                        <i class="fa-solid fa-heart" aria-hidden="true"></i>Thank you
                    </span>
                    <div class="lw-ticker-window">
                        <ul class="lw-ticker-track">
                            ${tickerItems.join("")}
                        </ul>
                        <ul class="lw-ticker-track lw-ticker-track--copy" aria-hidden="true">
                            ${tickerItems.join("")}
                        </ul>
                    </div>
                    <p class="lw-ticker-count">
                        <strong>${donors.length}</strong> donors · <strong>${volunteers.length}</strong> volunteers
                    </p>
                </div>
              `
            : "";


    fillCharitySide(
        "thanksTicker",
        sponsorsHtml + tickerHtml
    );


    autoScrollCharityTicker(
        document.querySelector("#thanksTicker .lw-ticker-window")
    );

    };


    /* Donors come from real completed donations when there are any,
       otherwise from the "donors" list in charity.json */

    renderThanks(
        asCharityArray(charity.donors)
    );


    fetch(
        `${API_BASE_URL}/api/charities/${encodeURIComponent(charity.id)}/donors`
    )
        .then(response => response.ok ? response.json() : { donors: [] })
        .then(data => {

            if (Array.isArray(data.donors) && data.donors.length) {
                renderThanks(data.donors);
            }

        })
        .catch(error => {

            console.error(
                "Failed to load donors:",
                error
            );

        });


    /* ---------- In the media ---------- */

    const mediaVerb = {
        article: "Read on",
        video: "Watch on",
        tv: "Watch on",
        radio: "Listen on",
        podcast: "Listen on",
        social: "View on"
    };


    const mediaIcon = {
        article: "fa-regular fa-newspaper",
        video: "fa-solid fa-play",
        tv: "fa-solid fa-tv",
        radio: "fa-solid fa-microphone",
        podcast: "fa-solid fa-microphone",
        social: "fa-solid fa-hashtag"
    };


    const media =
        asCharityArray(charity.media)
            .filter(item => item.title && item.url)
            .sort((a, b) =>
                Number(Boolean(b.ours)) - Number(Boolean(a.ours)) ||
                new Date(b.date || 0) - new Date(a.date || 0)
            );


    const mediaHtml =
        media.length
            ? `
                <section class="cw-section">
                    <h2>In the media</h2>
                    <div class="lw-media">
                        ${media.map(item => {

                            const type = mediaIcon[item.type] ? item.type : "article";
                            const outlet = item.ours ? "Today Newspaper" : item.outlet || "source";
                            const internal = item.ours && !/^https?:/.test(item.url);

                            return `
                                <a class="lw-media-card lw-media-card--${type}" href="${e(item.url)}"${internal ? "" : ' target="_blank" rel="noopener noreferrer"'}>
                                    ${item.thumbnail ? `
                                        <span class="lw-media-thumb">
                                            <img src="${e(getImagePath(item.thumbnail))}" alt="" loading="lazy">
                                            ${["video", "tv"].includes(type) ? `<span class="lw-play" aria-hidden="true"><i class="fa-solid fa-play"></i></span>` : ""}
                                        </span>
                                    ` : `
                                        <span class="lw-media-thumb lw-media-thumb--icon" aria-hidden="true">
                                            <i class="${mediaIcon[type]}"></i>
                                        </span>
                                    `}
                                    <span class="lw-media-body">
                                        <span class="lw-media-meta">
                                            ${item.logo
                                                ? `<img class="lw-media-logo" src="${e(getImagePath(item.logo))}" alt="${e(outlet)}">`
                                                : `<i class="${mediaIcon[type]}" aria-hidden="true"></i><span>${e(outlet)}</span>`}
                                            ${item.ours ? `<span class="lw-ours">From our pages</span>` : ""}
                                        </span>
                                        <span class="lw-media-title">${e(item.title)}</span>
                                        <span class="lw-media-foot">
                                            ${item.date ? `<time datetime="${e(item.date)}">${e(formatCharityShortDate(item.date))}</time>` : "<span></span>"}
                                            <span class="lw-media-link">${mediaVerb[type]} ${e(outlet)} →</span>
                                        </span>
                                    </span>
                                </a>
                            `;

                        }).join("")}
                    </div>
                </section>
              `
            : "";


    /* ---------- Organiser ---------- */

    const organiserLines = [];


    if (organiser.phone) {

        organiserLines.push(`
            <li>
                <i class="fa-solid fa-phone" aria-hidden="true"></i>
                <a href="tel:${e(organiser.phone.replace(/\s+/g, ""))}">${e(organiser.phone)}</a>
            </li>
        `);

    }


    if (organiser.email) {

        organiserLines.push(`
            <li>
                <i class="fa-solid fa-envelope" aria-hidden="true"></i>
                <a href="mailto:${e(organiser.email)}">${e(organiser.email)}</a>
            </li>
        `);

    }


    const organiserHtml =
        organiser.name || organiserLines.length
            ? `
                <section class="cw-section cw-organiser">
                    <h2>Organised by</h2>
                    ${organiser.name ? `<p class="cw-organiser-name">${e(organiser.name)}</p>` : ""}
                    ${organiserLines.length ? `<ul>${organiserLines.join("")}</ul>` : ""}
                </section>
              `
            : "";


    /* ---------- Page ---------- */

    container.innerHTML = `

        <a class="cw-back" href="charityEvents.html">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
            Charity archive
        </a>


        <section class="lw-hero">

            <h1>${e(charity.activityHeadline)}</h1>

            ${pileHtml}

            <div class="lw-hero-info">

                <div class="uw-hero-tags">
                    ${charity.label ? `<span class="cw-tag">${e(charity.label)}</span>` : ""}
                    <span class="lw-done">Campaign completed</span>
                </div>

                <ul class="cw-hero-meta">
                    <li>
                        <i class="fa-regular fa-calendar-check" aria-hidden="true"></i>
                        <time datetime="${e(charity.date)}">Held on ${e(formatCharityLongDate(charity.date))}</time>
                    </li>
                    ${charity.location ? `
                        <li>
                            <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                            <span>${e(charity.location)}</span>
                        </li>
                    ` : ""}
                </ul>

                <div class="uw-hero-actions">
                    <a class="uw-btn uw-btn--gold lw-next-link" href="charityEvents.html">Join the next campaign</a>
                    <a class="uw-btn lw-btn-outline lw-share" href="${shareUrl}" target="_blank" rel="noopener noreferrer">
                        <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
                        Share
                    </a>
                </div>

            </div>

        </section>


        ${resultsHtml}

        ${storyHtml}

        ${testimonialsHtml}

        ${beforeAfterHtml}


        ${mediaHtml}

        ${organiserHtml}


        <section class="lw-next" hidden>
            <span class="cw-countdown-label">Next campaign</span>
            <h2></h2>
            <p></p>
            <a class="uw-btn uw-btn--gold" href="#">Join the next campaign</a>
        </section>


        <section class="uw-more lw-more" hidden>
            <div class="uw-more-head">
                <h2>More campaigns</h2>
                <a href="charityEvents.html">
                    See all
                    <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
            </div>
            <div class="charity-container uw-more-grid"></div>
        </section>

    `;


    bindCampaignBehaviour(container, charity, gallery);


    loadMoreCharityActivities(
        container.querySelector(".lw-more"),
        charity.id
    );


    loadNextCharityCampaign(container);

}


/* Slow auto-scroll that people can still scroll by hand.
   Pauses on hover, touch, wheel or keyboard; loops seamlessly. */

function autoScrollCharityTicker(windowEl) {

    if (!windowEl) {
        return;
    }


    const copy =
        windowEl.querySelector(".lw-ticker-track--copy");


    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {

        copy?.remove();

        return;
    }


    const SPEED = 18;        /* pixels per second */

    const RESUME_AFTER = 2500;


    let pausedUntil = 0;

    let hovering = false;

    let last = performance.now();

    let position = null;


    const horizontal = () =>
        window.matchMedia("(max-width: 900px)").matches;


    const pause = () => {
        pausedUntil = performance.now() + RESUME_AFTER;
        position = null;
    };


    windowEl.addEventListener("mouseenter", () => { hovering = true; });

    windowEl.addEventListener("mouseleave", () => { hovering = false; pause(); });

    ["wheel", "touchstart", "touchmove", "keydown", "focusin"].forEach(type =>
        windowEl.addEventListener(type, pause, { passive: true })
    );


    function step(now) {

        const dt =
            Math.min(now - last, 100) / 1000;

        last = now;


        if (!windowEl.isConnected) {
            return;
        }


        if (!hovering && now > pausedUntil) {

            const key =
                horizontal() ? "scrollLeft" : "scrollTop";


            const loop =
                horizontal()
                    ? copy.offsetLeft - windowEl.firstElementChild.offsetLeft
                    : copy.offsetTop - windowEl.firstElementChild.offsetTop;


            if (position === null) {
                position = windowEl[key];
            }


            position += SPEED * dt;


            if (loop > 0 && position >= loop) {
                position -= loop;
            }


            windowEl[key] = position;

        }


        requestAnimationFrame(step);

    }


    requestAnimationFrame(step);

}


function fillCharitySide(id, html) {

    const side =
        document.getElementById(id);


    if (!side) {
        return;
    }


    side.querySelector(".lw-side-body").innerHTML =
        html;

    side.hidden =
        !html.trim();

}


function getCharityFileUrl(path) {

    return /^(https?:)?\/\//.test(path)
        ? path
        : getImagePath(path);

}


function bindCampaignBehaviour(container, charity, gallery) {

    /* Photo pile → lightbox */

    container
        .querySelectorAll("[data-photo]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => openCharityLightbox(
                    gallery,
                    Number(button.dataset.photo),
                    button
                )
            );

        });


    const pileImages =
        container.querySelectorAll(".lw-pile-photo img");


    pileImages.forEach(img => {

        img.addEventListener(
            "error",
            () => img.closest(".lw-pile-photo").remove()
        );

    });


    /* "See all" buttons */

    document
        .querySelectorAll("[data-expand]")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    button.parentElement
                        .querySelectorAll(`${button.dataset.expand} [hidden]`)
                        .forEach(item => {
                            item.hidden = false;
                        });

                    button.remove();

                }
            );

        });


    /* Before / after slider */

    const compare =
        container.querySelector(".lw-compare");


    if (compare) {

        const range =
            compare.querySelector("input");


        range.addEventListener(
            "input",
            () => compare.style.setProperty("--lw-pos", `${range.value}%`)
        );

    }


    /* Native share sheet when available */

    const share =
        container.querySelector(".lw-share");


    if (share && navigator.share) {

        share.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                navigator
                    .share({
                        title: charity.activityHeadline,
                        url: window.location.href
                    })
                    .catch(() => {});

            }
        );

    }

}


async function loadNextCharityCampaign(container) {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/charities`
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        const next =
            (Array.isArray(data.charities) ? data.charities : [])
                .filter(item =>
                    !Number.isNaN(new Date(item.date).getTime()) &&
                    isUpcomingCharity(item)
                )
                .sort((a, b) => new Date(a.date) - new Date(b.date))[0];


        if (!next) {
            return;
        }


        const url =
            getCharityDetailUrl(next);


        container
            .querySelectorAll(".lw-next-link")
            .forEach(link => {
                link.href = url;
            });


        const section =
            container.querySelector(".lw-next");


        section.querySelector("h2").textContent =
            next.activityHeadline;


        section.querySelector("p").textContent =
            [formatCharityLongDate(next.date), next.location]
                .filter(Boolean)
                .join(" · ");


        section.querySelector("a").href =
            url;


        section.hidden =
            false;

    } catch (error) {

        console.error(
            "Failed to load the next campaign:",
            error
        );

    }

}


/* =====================================================
   LIGHTBOX — full-screen photos
   Arrows / keyboard / swipe, counter, caption, thumbnails
===================================================== */

function openCharityLightbox(gallery, startIndex, opener) {

    if (!gallery.length) {
        return;
    }


    let index =
        startIndex;


    const box =
        document.createElement("div");


    box.className =
        "lw-lightbox";

    box.setAttribute("role", "dialog");

    box.setAttribute("aria-modal", "true");

    box.setAttribute("aria-label", "Photo viewer");


    box.innerHTML = `
        <div class="lw-lightbox-top">
            <span class="lw-lightbox-counter" aria-live="polite"></span>
            <button type="button" class="lw-lightbox-close" aria-label="Close">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </div>

        <div class="lw-lightbox-stage">
            <button type="button" class="lw-lightbox-nav lw-lightbox-prev" aria-label="Previous photo">
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <figure>
                <img alt="">
                <figcaption></figcaption>
            </figure>
            <button type="button" class="lw-lightbox-nav lw-lightbox-next" aria-label="Next photo">
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
        </div>

        <div class="lw-lightbox-thumbs">
            ${gallery.map((item, i) => `
                <button type="button" data-index="${i}" aria-label="Photo ${i + 1}">
                    <img src="${escapeCharityHtml(getImagePath(item.img))}" alt="" loading="lazy">
                </button>
            `).join("")}
        </div>
    `;


    const image =
        box.querySelector("figure img");

    const caption =
        box.querySelector("figcaption");

    const counter =
        box.querySelector(".lw-lightbox-counter");

    const thumbs =
        box.querySelectorAll(".lw-lightbox-thumbs button");


    function show(newIndex) {

        index =
            (newIndex + gallery.length) % gallery.length;


        const item =
            gallery[index];


        image.src =
            getImagePath(item.img);

        image.alt =
            item.caption || `Photo ${index + 1}`;

        caption.textContent =
            item.caption;

        caption.hidden =
            !item.caption;

        counter.textContent =
            `${index + 1} / ${gallery.length}`;


        thumbs.forEach((thumb, i) => {

            thumb.classList.toggle("active", i === index);

            thumb.setAttribute("aria-current", i === index ? "true" : "false");

        });


        thumbs[index].scrollIntoView({ block: "nearest", inline: "center" });

    }


    function close() {

        document.removeEventListener("keydown", onKey);

        document.body.style.overflow = "";

        box.remove();

        if (opener) {
            opener.focus();
        }

    }


    function onKey(event) {

        if (event.key === "Escape") {

            close();

        } else if (event.key === "ArrowRight") {

            show(index + 1);

        } else if (event.key === "ArrowLeft") {

            show(index - 1);

        } else if (event.key === "Tab") {

            /* Keep focus inside the viewer */

            const focusable =
                [...box.querySelectorAll("button")];

            const first = focusable[0];

            const last = focusable[focusable.length - 1];


            if (event.shiftKey && document.activeElement === first) {

                event.preventDefault();

                last.focus();

            } else if (!event.shiftKey && document.activeElement === last) {

                event.preventDefault();

                first.focus();

            }

        }

    }


    box.querySelector(".lw-lightbox-close").addEventListener("click", close);

    box.querySelector(".lw-lightbox-prev").addEventListener("click", () => show(index - 1));

    box.querySelector(".lw-lightbox-next").addEventListener("click", () => show(index + 1));


    thumbs.forEach(thumb => {

        thumb.addEventListener(
            "click",
            () => show(Number(thumb.dataset.index))
        );

    });


    /* Click on the dark background closes */

    box.querySelector(".lw-lightbox-stage").addEventListener(
        "click",
        function (event) {

            if (event.target === event.currentTarget) {
                close();
            }

        }
    );


    /* Swipe on phones */

    let touchX = null;


    box.addEventListener(
        "touchstart",
        event => {
            touchX = event.touches[0].clientX;
        },
        { passive: true }
    );


    box.addEventListener(
        "touchend",
        event => {

            if (touchX === null) {
                return;
            }


            const delta =
                event.changedTouches[0].clientX - touchX;


            if (Math.abs(delta) > 50) {
                show(index + (delta < 0 ? 1 : -1));
            }


            touchX = null;

        }
    );


    document.addEventListener("keydown", onKey);

    document.body.style.overflow = "hidden";

    document.body.appendChild(box);

    show(index);

    box.querySelector(".lw-lightbox-close").focus();

}


/* =====================================================
   UPCOMING WORK PAGE
   upcomingWork.html?id=<charity id>
===================================================== */

function formatCharityMoneyShort(amount, currency) {

    try {

        return new Intl.NumberFormat(
            "en-NG",
            {
                style: "currency",
                currency: currency || "NGN",
                notation: "compact",
                maximumFractionDigits: 2
            }
        ).format(
            Number(amount) || 0
        );

    } catch {

        return formatCharityMoney(amount, currency);

    }

}


function getCharityShareUrl(charity) {

    return `https://wa.me/?text=${encodeURIComponent(
        `${charity.activityHeadline} — ${window.location.href}`
    )}`;

}


function getCharityMapQuery(charity) {

    return charity.mapQuery || charity.location || "";

}


/* Calendar (.ics) — events last 3 hours by default */

function downloadCharityCalendar(charity) {

    const start =
        new Date(charity.date);


    if (Number.isNaN(start.getTime())) {
        return;
    }


    const end =
        new Date(
            start.getTime() +
            3 * 60 * 60 * 1000
        );


    const toIcsDate = date =>
        date.toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}/, "");


    const escapeIcs = value =>
        String(value || "")
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/,/g, "\\,")
            .replace(/;/g, "\;");


    const description =
        Array.isArray(charity.description)
            ? charity.description.join("\n\n")
            : charity.description || "";


    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Today Newspaper//Charity//EN",
        "BEGIN:VEVENT",
        `UID:charity-${charity.id}@todaynewspaper`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${escapeIcs(charity.activityHeadline)}`,
        `LOCATION:${escapeIcs(charity.location)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        `URL:${window.location.href}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");


    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(
            new Blob([ics], { type: "text/calendar" })
        );

    link.download =
        `${String(charity.activityHeadline || "event")
            .replace(/[^a-z0-9]+/gi, "-")
            .toLowerCase()}.ics`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(
        () => URL.revokeObjectURL(link.href),
        1000
    );

}


function renderUpcomingWork(container, charity) {

    const stage =
        getCharityStage(charity.date);


    if (stage === "after") {

        window.location.replace(
            `latestWork.html?id=${encodeURIComponent(charity.id)}`
        );

        return;
    }


    const isToday =
        stage === "today";


    const e =
        escapeCharityHtml;


    document.title =
        `${charity.activityHeadline} | Today Newspaper`;


    const hasDate =
        !Number.isNaN(new Date(charity.date).getTime());


    const daysLeft =
        hasDate
            ? getCharityDaysLeft(charity.date)
            : null;


    const dateText =
        hasDate
            ? new Date(charity.date).toLocaleDateString(
                "en-NG",
                { day: "numeric", month: "short", year: "numeric" }
            )
            : "Date to be announced";


    const organiser =
        charity.organiser || {};


    const mapQuery =
        getCharityMapQuery(charity);


    const mapsUrl =
        mapQuery
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
            : "";


    const shareUrl =
        getCharityShareUrl(charity);


    const fundraising =
        getCharityFundraising(charity);


    /* ---------- Countdown / live badge ---------- */

    const countdownHtml =
        isToday
            ? `
                <div class="uw-live">
                    <span class="uw-live-badge">Happening today</span>
                </div>
              `
            : `
                <div class="uw-countdown">
                    <i class="fa-regular fa-hourglass-half" aria-hidden="true"></i>
                    ${hasDate
                        ? `<strong>${daysLeft}</strong><span>${daysLeft === 1 ? "day left" : "days left"}</span>`
                        : `<span>Date to be announced</span>`}
                </div>
              `;


    /* ---------- Fundraising ---------- */

    const updatedText =
        fundraising &&
        fundraising.updatedAt &&
        !Number.isNaN(new Date(fundraising.updatedAt).getTime())
            ? `Last updated ${new Date(fundraising.updatedAt).toLocaleString(
                "en-NG",
                { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
            )}`
            : "";


    const fundraisingHtml =
        fundraising
            ? `
                <div class="uw-progress-block">
                    <div
                        class="cw-progress"
                        role="progressbar"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="${Math.min(100, fundraising.percent)}"
                        aria-label="Fundraising progress"
                    >
                        <span style="width: ${Math.min(100, fundraising.percent)}%"></span>
                    </div>
                    <p class="uw-progress-text">
                        <strong>${e(formatCharityMoneyShort(fundraising.raised, fundraising.currency))}</strong>
                        of ${e(formatCharityMoneyShort(fundraising.goal, fundraising.currency))}
                        <span>${fundraising.percent}%</span>
                    </p>
                    ${updatedText ? `<p class="uw-updated">${e(updatedText)}</p>` : ""}
                </div>
              `
            : "";


    /* ---------- Live updates (on the day) ---------- */

    const updates =
        Array.isArray(charity.updates)
            ? charity.updates.filter(item => item && (item.text || item.img))
            : [];


    const updatesHtml =
        isToday && updates.length
            ? `
                <section class="uw-section uw-lead">
                    <h2>Live updates</h2>
                    <ol class="uw-updates">
                        ${updates.slice().reverse().map(item => `
                            <li>
                                ${item.time ? `<span class="uw-updates-time">${e(item.time)}</span>` : ""}
                                ${item.text ? `<p>${e(item.text)}</p>` : ""}
                                ${item.img ? `<img src="${e(getImagePath(item.img))}" alt="" loading="lazy">` : ""}
                            </li>
                        `).join("")}
                    </ol>
                </section>
              `
            : "";


    /* ---------- Schedule ---------- */

    const schedule =
        Array.isArray(charity.schedule)
            ? charity.schedule
            : [];


    const scheduleHtml =
        schedule.length
            ? `
                <section class="uw-section">
                    <h2>Programme</h2>
                    <ol class="cw-schedule">
                        ${schedule.map(item => `
                            <li>
                                <span class="cw-schedule-time">${e(item.time)}</span>
                                <span class="cw-schedule-activity">${e(item.activity)}</span>
                            </li>
                        `).join("")}
                    </ol>
                </section>
              `
            : "";


    /* ---------- How you can help ---------- */

    const volunteerHref =
        charity.volunteerUrl ||
        (
            organiser.email
                ? `mailto:${organiser.email}?subject=${encodeURIComponent(`Volunteer: ${charity.activityHeadline}`)}`
                : ""
        );


    const helpCards = [];


    if (!isToday) {

        helpCards.push(`
            <div class="uw-help-card">
                <i class="fa-solid fa-hand-holding-heart" aria-hidden="true"></i>
                <h3>Donate</h3>
                <p>Every gift goes directly to this activity.</p>
                <button type="button" class="uw-link-btn" data-action="donate">Give now</button>
            </div>
        `);


        if (volunteerHref) {

            helpCards.push(`
                <div class="uw-help-card">
                    <i class="fa-solid fa-people-group" aria-hidden="true"></i>
                    <h3>Volunteer</h3>
                    <p>Give a few hours of your time on the day.</p>
                    <a class="uw-link-btn" href="${e(volunteerHref)}"${/^https?:/.test(volunteerHref) ? ' target="_blank" rel="noopener noreferrer"' : ""}>Join the team</a>
                </div>
            `);

        }

    }


    helpCards.push(`
        <div class="uw-help-card">
            <i class="fa-solid fa-bullhorn" aria-hidden="true"></i>
            <h3>Spread the word</h3>
            <p>Share this activity with friends and family.</p>
            <a class="uw-link-btn" href="${shareUrl}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        </div>
    `);


    const helpHtml = `
        <section class="uw-section" id="uwHelp">
            <h2>How you can help</h2>
            <div class="uw-help uw-help--${helpCards.length}">${helpCards.join("")}</div>
        </section>
    `;


    /* ---------- Location ---------- */

    const mapHtml =
        mapQuery
            ? `
                <section class="uw-section${isToday ? " uw-lead uw-map-section--live" : ""}">
                    <h2>${isToday ? "Find us today" : "Location"}</h2>
                    ${charity.location ? `<p class="uw-address"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${e(charity.location)}</p>` : ""}
                    <div class="uw-map">
                        <iframe
                            title="Map of ${e(charity.location || mapQuery)}"
                            src="https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed"
                            loading="lazy"
                            referrerpolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                </section>
              `
            : "";


    /* ---------- Questions ---------- */

    const contactBits = [];


    if (organiser.email) {

        contactBits.push(
            `<a href="mailto:${e(organiser.email)}">${e(organiser.email)}</a>`
        );

    }


    if (organiser.phone) {

        contactBits.push(
            `<a href="tel:${e(organiser.phone.replace(/\s+/g, ""))}">${e(organiser.phone)}</a>`
        );

    }


    const questionsHtml =
        contactBits.length
            ? `
                <section class="uw-questions">
                    <i class="fa-regular fa-circle-question" aria-hidden="true"></i>
                    <p>
                        <strong>Questions?</strong>
                        Contact ${e(organiser.name || "the organisers")} at
                        ${contactBits.join(" or ")}.
                    </p>
                </section>
              `
            : "";


    /* ---------- About ---------- */

    const aboutHtml = `
        <section class="uw-section uw-lead">
            <h2>About this event</h2>
            <div class="cw-description">
                ${renderCharityList(charity.description, "<p>More details will be shared soon.</p>")}
            </div>
        </section>
    `;


    /* Before: About first. On the day: updates and map first. */

    const mainHtml =
        isToday
            ? updatesHtml + mapHtml + aboutHtml + scheduleHtml + helpHtml + questionsHtml
            : aboutHtml + scheduleHtml + helpHtml + mapHtml + questionsHtml;


    /* ---------- Hero buttons ---------- */

    const heroActions =
        isToday
            ? (mapsUrl ? `<a class="uw-btn uw-btn--gold" href="${mapsUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i>Open in Maps</a>` : "")
            : renderCharityCtaButton(charity, "uw-btn uw-btn--gold");


    /* ---------- Mobile bottom bar ---------- */

    const bottomBarHtml =
        isToday
            ? `
                <div class="uw-bottom-bar">
                    <span class="uw-live-badge">Happening today</span>
                    ${mapsUrl ? `<a class="uw-btn uw-btn--gold" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open in Maps</a>` : ""}
                </div>
              `
            : `
                <div class="uw-bottom-bar">
                    <span>
                        ${fundraising
                            ? `<strong>${e(formatCharityMoneyShort(fundraising.raised, fundraising.currency))}</strong> raised`
                            : hasDate
                                ? `<strong>${daysLeft}</strong> ${daysLeft === 1 ? "day left" : "days left"}`
                                : e(charity.activityHeadline)}
                    </span>
                    ${renderCharityCtaButton(charity, "uw-btn uw-btn--gold")}
                </div>
              `;


    /* ---------- Page ---------- */

    container.innerHTML = `

        <section class="uw-hero${charity.img ? "" : " uw-hero--banner"}">

            ${charity.img ? `<img class="uw-hero-image" src="${e(getImagePath(charity.img))}" alt="">` : ""}

            <div class="uw-hero-inner">

                <div class="uw-hero-text">

                    <a class="uw-back" href="charityEvents.html">
                        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                        All charity events
                    </a>

                    <div class="uw-hero-tags">
                        ${charity.label ? `<span class="cw-tag">${e(charity.label)}</span>` : ""}
                        ${isToday ? `<span class="uw-live-badge">Happening today</span>` : ""}
                    </div>

                    <h1>${e(charity.activityHeadline)}</h1>

                    <p class="uw-hero-meta">
                        ${charity.location ? `<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${e(charity.location)}</span>` : ""}
                        <span><i class="fa-regular fa-calendar" aria-hidden="true"></i><time${hasDate ? ` datetime="${e(charity.date)}"` : ""}>${e(dateText)}</time></span>
                    </p>

                    <div class="uw-hero-actions">
                        ${heroActions}
                        <a class="uw-btn uw-btn--ghost" href="${shareUrl}" target="_blank" rel="noopener noreferrer">
                            <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
                            Share
                        </a>
                    </div>

                </div>

                ${renderCharityDateBadge(charity.date, "uw-date-badge")}

            </div>

        </section>


        <div class="uw-body">

            <div class="uw-main">
                ${mainHtml}
            </div>


            <aside class="uw-panel">

                <div class="uw-panel-card">

                    ${countdownHtml}

                    ${fundraisingHtml}

                    ${isToday ? "" : renderCharityCtaButton(charity, "uw-btn uw-btn--primary uw-btn--block")}

                    <ul class="uw-panel-links">
                        ${!isToday && hasDate ? `
                            <li>
                                <button type="button" data-action="calendar">
                                    <i class="fa-regular fa-calendar-plus" aria-hidden="true"></i>
                                    Add to calendar
                                </button>
                            </li>
                        ` : ""}
                        ${mapsUrl ? `
                            <li>
                                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">
                                    <i class="fa-solid fa-map-location-dot" aria-hidden="true"></i>
                                    Open in Maps
                                </a>
                            </li>
                        ` : ""}
                        <li>
                            <a href="${shareUrl}" target="_blank" rel="noopener noreferrer">
                                <i class="fa-brands fa-whatsapp" aria-hidden="true"></i>
                                Share on WhatsApp
                            </a>
                        </li>
                    </ul>

                    ${organiser.name || (charity.partners && charity.partners.length) ? `
                        <div class="uw-organiser">
                            <span class="uw-organiser-label">Organised by</span>
                            ${organiser.name ? `<p>${e(organiser.name)}</p>` : ""}
                            ${renderCharityPartners(charity, "uw-partners")}
                        </div>
                    ` : ""}

                </div>

            </aside>

        </div>


        <section class="uw-more" hidden>
            <div class="uw-more-head">
                <h2>More activities</h2>
                <a href="charityEvents.html">
                    See all
                    <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
            </div>
            <div class="charity-container uw-more-grid"></div>
        </section>


        ${bottomBarHtml}

    `;


    bindCharityHeroFallback(container, ".uw-hero", "uw-hero--banner");


    bindCharityActions(container, charity);


    loadMoreCharityActivities(
        container.querySelector(".uw-more"),
        charity.id
    );

}


/* More activities — the 3 most recent past activities */

async function loadMoreCharityActivities(section, currentId) {

    if (!section) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/charities`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        const items =
            (Array.isArray(data.charities) ? data.charities : [])
                .filter(item =>
                    String(item.id) !== String(currentId) &&
                    !Number.isNaN(new Date(item.date).getTime()) &&
                    !isUpcomingCharity(item)
                )
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3);


        if (!items.length) {
            return;
        }


        renderCharityCards(
            items,
            section.querySelector(".uw-more-grid"),
            false
        );


        section.hidden = false;

    } catch (error) {

        console.error(
            "Failed to load more activities:",
            error
        );

    }

}


/* =====================================================
   CHARITY PAGES — COLLAPSED SITE NAV + ACTIVITY SEARCH
   The site nav shrinks to a thin navy line. "Menu" shows it
   (and hides the search); it collapses again after 15s.
===================================================== */

const CHARITY_NAV_AUTO_HIDE = 15000;

const CHARITY_NAV_INTRO_DELAY = 1200;


let charitySearchList = null;


function initCharityNav() {

    const nav =
        document.querySelector("nav");


    if (!nav || document.querySelector(".cw-navbar")) {
        return;
    }


    /* Starts open, then folds away so the visitor sees it close */

    nav.classList.add("cw-nav");

    nav.setAttribute("aria-expanded", "true");


    const bar =
        document.createElement("div");

    bar.className =
        "cw-navbar";

    bar.innerHTML = `
        <form class="cw-search" role="search" autocomplete="off">
            <label class="cw-visually-hidden" for="charitySearch">Search a charity activity</label>
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input id="charitySearch" type="search" placeholder="Search a charity activity…">
            <ul class="cw-search-results" role="listbox" hidden></ul>
        </form>
    `;

    nav.after(bar);


    let hideTimer = null;


    const setOpen = open => {

        nav.classList.toggle("cw-nav-collapsed", !open);

        bar.classList.toggle("cw-navbar--open", open);

        document.documentElement.classList.toggle("cw-nav-open", open);

        nav.setAttribute("aria-expanded", String(open));

        nav.setAttribute("aria-label", open ? "Hide the menu" : "Show the menu");


        /* Only a button while it is the thin line */

        if (open) {
            nav.removeAttribute("role");
            nav.removeAttribute("tabindex");
        } else {
            nav.setAttribute("role", "button");
            nav.tabIndex = 0;
        }


        clearTimeout(hideTimer);


        if (open) {
            hideTimer = setTimeout(tryClose, CHARITY_NAV_AUTO_HIDE);
        }

    };


    /* Wait while the reader is still using the nav */

    const tryClose = () => {

        const menu =
            document.getElementById("links");

        const busy =
            nav.matches(":hover") ||
            nav.contains(document.activeElement) ||
            (menu && menu.classList.contains("show"));


        if (busy) {

            hideTimer = setTimeout(tryClose, 3000);

            return;
        }


        setOpen(false);

    };


    /* Click the line to show; click the bar's empty space to hide */

    nav.addEventListener(
        "click",
        event => {

            if (nav.classList.contains("cw-nav-collapsed")) {

                setOpen(true);

            } else if (!event.target.closest("a, input, button, .dot, .search-box")) {

                setOpen(false);

            }

        }
    );


    nav.addEventListener(
        "keydown",
        event => {

            if (
                nav.classList.contains("cw-nav-collapsed") &&
                (event.key === "Enter" || event.key === " ")
            ) {

                event.preventDefault();

                setOpen(true);

            }

        }
    );


    initCharitySearch(bar.querySelector(".cw-search"));


    /* Charity home: the search sits next to the impact figures */

    const slot =
        document.getElementById("cpSearchSlot");

    if (slot) {

        slot.appendChild(bar.querySelector(".cw-search"));

        bar.classList.add("cw-navbar--empty");

    }


    bar.classList.add("cw-navbar--open");

    setTimeout(() => setOpen(false), CHARITY_NAV_INTRO_DELAY);

}


function initCharitySearch(form) {

    const input =
        form.querySelector("input");

    const results =
        form.querySelector(".cw-search-results");


    const load = async () => {

        if (charitySearchList) {
            return charitySearchList;
        }


        try {

            const response =
                await fetch(`${API_BASE_URL}/api/charities`);

            const data =
                await response.json();

            charitySearchList =
                Array.isArray(data.charities) ? data.charities : [];

        } catch (error) {

            console.error("Charity search failed:", error);

            charitySearchList = [];

        }


        return charitySearchList;

    };


    const close = () => {

        results.hidden = true;

        results.innerHTML = "";

    };


    const search = async () => {

        const query =
            input.value.trim().toLowerCase();


        if (query.length < 2) {

            close();

            return;
        }


        const words =
            query.split(/\s+/);


        const matches =
            (await load())
                .filter(item => {

                    const haystack = [
                        item.activityHeadline,
                        item.location,
                        item.label,
                        formatCharityDate(item.date)
                    ].join(" ").toLowerCase();

                    return words.every(word => haystack.includes(word));

                })
                .sort((a, b) =>
                    Number(isUpcomingCharity(b)) - Number(isUpcomingCharity(a)) ||
                    new Date(b.date) - new Date(a.date)
                )
                .slice(0, 6);


        results.innerHTML =
            matches.length
                ? matches.map(item => `
                    <li role="option">
                        <a href="${getCharityDetailUrl(item)}">
                            <span class="cw-search-title">${escapeCharityHtml(item.activityHeadline)}</span>
                            <span class="cw-search-meta">
                                <span class="cw-search-badge${isUpcomingCharity(item) ? " is-upcoming" : ""}">
                                    ${isUpcomingCharity(item) ? "Upcoming" : "Past"}
                                </span>
                                ${escapeCharityHtml(formatCharityDate(item.date))}
                            </span>
                        </a>
                    </li>
                `).join("")
                : `<li class="cw-search-empty">No activity found.</li>`;


        results.hidden = false;

    };


    input.addEventListener("input", search);

    input.addEventListener("focus", load, { once: true });


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const first =
                results.querySelector("a");

            if (first) {
                window.location.href = first.href;
            }

        }
    );


    input.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                input.value = "";
                close();
            }
        }
    );


    document.addEventListener(
        "click",
        event => {
            if (!form.contains(event.target)) {
                close();
            }
        }
    );

}


/* =====================================================
   CHARITY HOME — laid out like a newspaper front page
   Front page poster + agenda (upcoming), archives (past),
   impact figures, readers' ideas, thank-you band, partners.
===================================================== */

const CHARITY_AGENDA_MAX = 5;

const CHARITY_STAMP_DAYS = 7;

const CHARITY_WHATSAPP_URL =
    "https://chat.whatsapp.com/JRep0h9StkDKcaHAel0TeN?mode=gi_t";


let latestCharityYear = "all";

let charityIdeas = [];



const CHARITY_THEME_ART = {

    education: `
        <path d="M60 34c-12-8-28-10-42-8v62c14-2 30 0 42 8 12-8 28-10 42-8V26c-14-2-30 0-42 8z"/>
        <path d="M60 34v62"/>
        <path d="M28 44c8-1 16 0 22 3M28 56c8-1 16 0 22 3M28 68c8-1 16 0 22 3M70 47c6-3 14-4 22-3M70 59c6-3 14-4 22-3M70 71c6-3 14-4 22-3"/>`,

    water: `
        <path d="M60 14C46 38 30 56 30 74a30 30 0 0 0 60 0c0-18-16-36-30-60z"/>
        <path d="M45 76a15 15 0 0 0 15 15"/>`,

    health: `
        <path d="M48 22h24v26h26v24H72v26H48V72H22V48h26z"/>
        <circle cx="60" cy="60" r="52" stroke-dasharray="3 7"/>`,

    food: `
        <path d="M16 60h88a44 32 0 0 1-88 0z"/>
        <path d="M40 100h40"/>
        <path d="M46 48c-5-7 5-11 0-18M60 48c-5-7 5-11 0-18M74 48c-5-7 5-11 0-18"/>`,

    christmas: `
        <rect x="22" y="50" width="76" height="50" rx="2"/>
        <rect x="16" y="38" width="88" height="14" rx="2"/>
        <path d="M60 38v62"/>
        <path d="M60 38c-6-14-26-16-24-4 1 6 14 6 24 4zM60 38c6-14 26-16 24-4-1 6-14 6-24 4z"/>`,

    heart: `
        <path d="M60 100S18 74 18 46a21 21 0 0 1 42-9 21 21 0 0 1 42 9c0 28-42 54-42 54z"/>
        <path d="M60 86S32 68 32 48" stroke-dasharray="2 6"/>`

};


function charityThemeArt(theme) {

    return `
        <svg class="cp-art" viewBox="0 0 120 120" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            ${CHARITY_THEME_ART[theme] || CHARITY_THEME_ART.heart}
        </svg>
    `;

}


function charityFirstSentence(charity) {

    const text =
        asCharityArray(charity.description)[0] || "";


    const match =
        String(text).match(/^.*?[.!?](\s|$)/);


    return (match ? match[0] : text).trim();

}


function charityShortDate(date) {

    const value =
        new Date(date);


    return Number.isNaN(value.getTime())
        ? ""
        : value.toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", year: "numeric" }
        );

}


function charityAbsoluteUrl(charity) {

    return new URL(
        getCharityDetailUrl(charity),
        window.location.href
    ).href;

}


function charityQrSvg(url) {

    if (typeof window.qrcode !== "function") {
        return "";
    }


    try {

        const qr =
            window.qrcode(0, "M");

        qr.addData(url);

        qr.make();


        return qr.createSvgTag({
            cellSize: 4,
            margin: 0,
            scalable: true
        });

    } catch {

        return "";

    }

}


function charityPosterStamp(charity) {

    const daysLeft =
        getCharityDaysLeft(charity.date);


    if (daysLeft >= 0 && daysLeft < CHARITY_STAMP_DAYS) {
        return "Last days";
    }


    const announced =
        new Date(charity.announcedAt);


    if (
        !Number.isNaN(announced.getTime()) &&
        Date.now() - announced.getTime() < CHARITY_STAMP_DAYS * 24 * 60 * 60 * 1000
    ) {
        return "New";
    }


    return "";

}


function charityPartnerNames(charity) {

    return asCharityArray(charity.partners)
        .map(partner => partner.name)
        .filter(name => name && name.toLowerCase() !== "partner name");

}


/* format: responsive (16:9 → 4:5 on phones), square, story, wide, portrait */

function buildCharityPoster(charity, format = "responsive") {

    const e =
        escapeCharityHtml;


    if (charity.poster) {

        return `
            <div class="cp-poster cp-poster--${format} cp-poster--image">
                <img src="${e(getImagePath(charity.poster))}" alt="Campaign poster: ${e(charity.activityHeadline)}">
            </div>
        `;

    }


    const year =
        new Date(charity.date).getFullYear() || "";

    const stamp =
        charityPosterStamp(charity);

    const partners =
        charityPartnerNames(charity);

    const lead =
        charityFirstSentence(charity);


    return `
        <div class="cp-poster cp-poster--${format}">
        <div class="cp-poster-inner">

            <div class="cp-poster-top">
                <span class="cp-poster-brand">Today Cares</span>
                <span>Campaign ${e(year)}</span>
            </div>

            <div class="cp-poster-text">
                ${charity.label ? `<span class="cp-poster-kicker">${e(charity.label)}</span>` : ""}
                <h3 class="cp-poster-title">${e(charity.activityHeadline)}</h3>
                <span class="cp-poster-rule" aria-hidden="true"></span>
                ${lead ? `<p class="cp-poster-lead">${e(lead)}</p>` : ""}
            </div>

            <div class="cp-poster-art">
                ${charityThemeArt(charity.theme)}
                ${stamp ? `<span class="cp-stamp">${e(stamp)}</span>` : ""}
            </div>

            <div class="cp-poster-bottom">
                <div class="cp-poster-when">
                    <strong>${e(charityShortDate(charity.date))}</strong>
                    ${charity.location ? `<span>${e(charity.location)}</span>` : ""}
                </div>
                <div class="cp-poster-cta">
                    <div>
                        <strong>Donate</strong>
                        <span>${e(window.location.host || "todaynewspaper")}</span>
                    </div>
                    <div class="cp-poster-qr">${charityQrSvg(charityAbsoluteUrl(charity))}</div>
                </div>
            </div>

            ${partners.length ? `<p class="cp-poster-partners">With ${e(partners.join(" · "))}</p>` : ""}

        </div>
        </div>
    `;

}


/* ---------- Front page: the next campaign ---------- */

function renderCharityFrontPage(charity) {

    const front =
        document.getElementById("cpFront");


    if (!front) {
        return;
    }


    if (!charity) {

        front.innerHTML = `
            <p class="cp-empty">
                Our next action is being prepared.
                <a href="${CHARITY_WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Join our WhatsApp</a>
                to be the first to know.
            </p>
        `;

        return;
    }


    const e =
        escapeCharityHtml;

    const fundraising =
        getCharityFundraising(charity);

    const stage =
        getCharityStage(charity.date);

    const daysLeft =
        getCharityDaysLeft(charity.date);

    const detailUrl =
        getCharityDetailUrl(charity);

    const firstParagraph =
        asCharityArray(charity.description)[0] || "";

    const shareUrl =
        `https://wa.me/?text=${encodeURIComponent(`${charity.activityHeadline} — ${charityAbsoluteUrl(charity)}`)}`;


    front.innerHTML = `

        <figure class="cp-poster-figure">
            ${buildCharityPoster(charity, "responsive")}
            <figcaption class="cp-caption">
                Official campaign poster. Photos of the event will be published after
                ${e(charityShortDate(charity.date))}. — Today Cares
            </figcaption>
        </figure>

        <div class="cp-variants">
            <span class="cp-variants-label">Also available:</span>
            <button type="button" class="cp-variant" data-poster="square" aria-label="Download the Instagram poster (1:1)">
                <span class="cp-variant-thumb cp-variant-thumb--square">${buildCharityPoster(charity, "square")}</span>
                <span>1:1 Instagram</span>
            </button>
            <button type="button" class="cp-variant" data-poster="story" aria-label="Download the WhatsApp poster (9:16)">
                <span class="cp-variant-thumb cp-variant-thumb--story">${buildCharityPoster(charity, "story")}</span>
                <span>9:16 WhatsApp</span>
            </button>
            <div class="cp-variant-actions">
                <button type="button" class="cp-btn cp-btn--outline" data-poster="main">⬇ Download poster</button>
                <a class="cp-btn cp-btn--outline" href="${shareUrl}" target="_blank" rel="noopener noreferrer">💬 Share</a>
            </div>
        </div>

        <div class="cp-front-details">

            <div class="cp-front-story">
                ${charity.label ? `<span class="cp-label">${e(charity.label)}</span>` : ""}
                <h3 class="cp-front-title"><a href="${detailUrl}">${e(charity.activityHeadline)}</a></h3>
                <p class="cp-smallcaps">
                    ${e(charityShortDate(charity.date))}${charity.location ? ` · ${e(charity.location)}` : ""}
                </p>
                ${firstParagraph ? `<p class="cp-dropcap">${e(firstParagraph)}</p>` : ""}
            </div>

            <div class="cp-front-action">

                <div class="cp-countdown">
                    ${stage === "today"
                        ? `<strong>Today</strong><span>The campaign happens today</span>`
                        : `<strong>${daysLeft}</strong><span>${daysLeft === 1 ? "day left" : "days left"}</span>`}
                </div>

                ${fundraising ? `
                    <div class="cp-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                         aria-valuenow="${Math.min(100, fundraising.percent)}" aria-label="Fundraising progress">
                        <span style="width: ${Math.min(100, fundraising.percent)}%"></span>
                    </div>
                    <p class="cp-progress-text">
                        <strong>${e(formatCharityMoney(fundraising.raised, fundraising.currency))}</strong>
                        raised of ${e(formatCharityMoney(fundraising.goal, fundraising.currency))}
                    </p>
                ` : ""}

                <button type="button" class="cp-btn cp-btn--navy" data-donate>Donate</button>

                <div class="cp-front-row">
                    <a class="cp-btn cp-btn--outline" href="${detailUrl}">View campaign</a>
                    <button type="button" class="charity-reminder cp-reminder"></button>
                </div>

                <p class="cp-secure">🔒 Secure payment via Flutterwave</p>

            </div>

        </div>
    `;


    /* Donate: the existing donation journey */

    front
        .querySelector("[data-donate]")
        .addEventListener("click", () => handleDonateClick(charity));


    /* Reminder: the existing reminder picker */

    const reminderButton =
        front.querySelector(".cp-reminder");

    reminderButton.dataset.charityId =
        charity.id;

    setReminderButtonState(
        reminderButton,
        Boolean(getSavedReminder(charity.id))
    );

    reminderButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openReminderPicker(charity, reminderButton);

        }
    );


    /* Poster downloads */

    front
        .querySelectorAll("[data-poster]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => downloadCharityPoster(charity, button.dataset.poster, button)
            );

        });

}


/* Renders the poster off-screen at full size and saves it as a PNG */

async function downloadCharityPoster(charity, format, button) {

    const fileName =
        `${String(charity.activityHeadline || "campaign")
            .replace(/[^a-z0-9]+/gi, "-")
            .toLowerCase()}-${format}`;


    if (charity.poster) {

        const link =
            document.createElement("a");

        link.href = getImagePath(charity.poster);

        link.download = fileName;

        link.click();

        return;
    }


    if (!window.htmlToImage) {

        console.error("Poster export library not loaded.");

        return;
    }


    const sizes = {
        main: window.matchMedia("(max-width: 900px)").matches
            ? ["portrait", 1080, 1350]
            : ["wide", 1600, 900],
        square: ["square", 1080, 1080],
        story: ["story", 1080, 1920]
    };


    const [posterFormat, width, height] =
        sizes[format] || sizes.main;


    const stage =
        document.createElement("div");

    stage.className = "cp-export-stage";

    stage.style.width = `${width}px`;

    stage.innerHTML = buildCharityPoster(charity, posterFormat);

    document.body.appendChild(stage);


    const poster =
        stage.firstElementChild;


    const previous =
        button.textContent;


    button.disabled = true;


    try {

        const dataUrl =
            await window.htmlToImage.toPng(
                poster,
                { width, height, pixelRatio: 1, cacheBust: true }
            );


        const link =
            document.createElement("a");

        link.href = dataUrl;

        link.download = `${fileName}.png`;

        link.click();

    } catch (error) {

        console.error("Poster export failed:", error);

    } finally {

        stage.remove();

        button.disabled = false;

        button.textContent = previous;

    }

}


/* ---------- Agenda: next campaigns + ideas chosen by readers ---------- */

function renderUpcomingCharity() {

    const container =
        document.getElementById(
            "upcomingCharity"
        );


    if (!container) {
        return;
    }


    renderCharityFrontPage(
        upcomingCharityData[0]
    );


    const e =
        escapeCharityHtml;

    const agenda =
        upcomingCharityData.slice(1, 1 + CHARITY_AGENDA_MAX);

    const chosen =
        charityIdeas.filter(idea => idea.chosen);


    const count =
        document.getElementById("cpAgendaCount");

    if (count) {
        count.textContent =
            chosen.length
                ? `${agenda.length} + ${chosen.length} ⭐`
                : String(agenda.length);
    }


    if (!agenda.length && !chosen.length) {

        container.innerHTML = `
            <p class="cp-empty">
                Our next action is being prepared.
                <a href="${CHARITY_WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Join our WhatsApp</a>
                to be the first to know.
            </p>
        `;

        return;
    }


    container.innerHTML = `
        <ol class="cp-agenda">

            ${agenda.map(charity => {

                const date = new Date(charity.date);
                const fundraising = getCharityFundraising(charity);

                const url = getCharityDetailUrl(charity);

                return `
                    <li class="cp-agenda-row" data-charity="${e(charity.id)}">
                        <div class="cp-agenda-item">
                            <a class="cp-agenda-date" href="${url}" tabindex="-1" aria-hidden="true">
                                <strong>${date.getDate()}</strong>
                                <span>${e(date.toLocaleDateString("en-GB", { month: "short" }))}</span>
                            </a>
                            <span class="cp-agenda-body">
                                <a class="cp-agenda-title" href="${url}">${e(charity.activityHeadline)}</a>
                                <span class="cp-agenda-meta">${e([charity.location, charity.label].filter(Boolean).join(" · "))}</span>
                                ${fundraising ? `<span class="cp-mini-bar"><span style="width: ${Math.min(100, fundraising.percent)}%"></span></span>` : ""}
                                <span class="cp-agenda-actions">
                                    <button type="button" class="cp-btn cp-btn--navy cp-btn--sm" data-agenda-donate>Donate</button>
                                    <button type="button" class="charity-reminder cp-reminder cp-reminder--sm"></button>
                                </span>
                            </span>
                        </div>
                    </li>
                `;

            }).join("")}

            ${chosen.map(idea => `
                <li>
                    <div class="cp-agenda-item cp-agenda-item--chosen">
                        <span class="cp-agenda-date">
                            <strong>★</strong>
                            <span>Soon</span>
                        </span>
                        <span class="cp-agenda-body">
                            <span class="cp-chosen-badge">⭐ Chosen by the community</span>
                            <span class="cp-agenda-title">${e(idea.title)}</span>
                            <span class="cp-agenda-meta">${e([idea.location, idea.category].filter(Boolean).join(" · "))}</span>
                        </span>
                    </div>
                </li>
            `).join("")}

        </ol>
    `;


    /* Donate + reminder: the existing journeys */

    container
        .querySelectorAll(".cp-agenda-row")
        .forEach(row => {

            const charity =
                agenda.find(item => String(item.id) === row.dataset.charity);


            if (!charity) {
                return;
            }


            row
                .querySelector("[data-agenda-donate]")
                .addEventListener("click", () => handleDonateClick(charity));


            const reminderButton =
                row.querySelector(".cp-reminder");

            reminderButton.dataset.charityId =
                charity.id;

            setReminderButtonState(
                reminderButton,
                Boolean(getSavedReminder(charity.id))
            );

            reminderButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openReminderPicker(charity, reminderButton);

                }
            );

        });

}


/* ---------- Archives: past campaigns by year ---------- */

function renderLatestCharity() {

    const container =
        document.getElementById(
            "latestCharity"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    renderCharityYearFilters();


    const items =
        latestCharityYear === "all"
            ? latestCharityData
            : latestCharityData.filter(charity =>
                String(new Date(charity.date).getFullYear()) === latestCharityYear
            );


    if (!items.length) {

        container.innerHTML = `
            <div class="charity-empty">
                <p>
                    No past activities available.
                </p>
            </div>
        `;

        return;
    }


    const start =
        (latestCharityPage - 1) * CHARITY_PER_PAGE;

    const pageItems =
        items.slice(start, start + CHARITY_PER_PAGE);


    /* Group the page by year */

    const years =
        [...new Set(pageItems.map(charity => new Date(charity.date).getFullYear()))];


    const e =
        escapeCharityHtml;


    container.innerHTML =
        years.map(year => `
            <section class="cp-year">
                <h3 class="cp-year-title"><span>${year}</span></h3>
                <div class="cp-archive-grid">
                    ${pageItems
                        .filter(charity => new Date(charity.date).getFullYear() === year)
                        .map(charity => {

                            const fundraising = getCharityFundraising(charity);
                            const gallery = getCharityGallery(charity);
                            const stat = asCharityArray(charity.results && charity.results.stats)[0];
                            const lead = charityFirstSentence(charity);

                            return `
                                <article class="cp-archive-card">
                                    <a href="${getCharityDetailUrl(charity)}">
                                        <span class="cp-archive-photo">
                                            <span class="cp-print cp-print--back" aria-hidden="true"></span>
                                            <span class="cp-print cp-print--front" aria-hidden="true"></span>
                                            <span class="cp-archive-image">
                                                <img loading="lazy" src="${e(getImagePath(charity.img))}" alt="">
                                            </span>
                                            <span class="cp-badge">✓ ${fundraising && fundraising.raised > 0 ? `${fundraising.percent}%` : "Done"}</span>
                                            ${gallery.length ? `<span class="cp-photos">📷 ${gallery.length} photos</span>` : ""}
                                        </span>
                                        <span class="cp-smallcaps">
                                            ${e(charityShortDate(charity.date))}${charity.location ? ` · ${e(charity.location)}` : ""}
                                        </span>
                                        <span class="cp-archive-title">${e(charity.activityHeadline)}</span>
                                        ${lead ? `<span class="cp-archive-lead">${e(lead)}</span>` : ""}
                                        ${stat && stat.value ? `<span class="cp-archive-result">${e(stat.value)} ${e(stat.label || "")}</span>` : ""}
                                    </a>
                                </article>
                            `;

                        }).join("")}
                </div>
            </section>
        `).join("");


    /* Missing photo: navy placeholder instead of a broken image */

    container
        .querySelectorAll(".cp-archive-image img")
        .forEach(img => {

            img.addEventListener(
                "error",
                () => img.closest(".cp-archive-image").classList.add("is-missing")
            );

        });


    renderCharityPagination(
        container,
        items.length,
        latestCharityPage,
        page => {

            latestCharityPage =
                page;

            renderLatestCharity();

            document
                .getElementById("cpArchivesTitle")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });

        }
    );

}


function renderCharityYearFilters() {

    const filters =
        document.getElementById("cpFilters");


    if (!filters) {
        return;
    }


    const years =
        [...new Set(
            latestCharityData
                .map(charity => new Date(charity.date).getFullYear())
                .filter(Boolean)
        )].sort((a, b) => b - a);


    filters.innerHTML =
        ["all", ...years.map(String)]
            .map(year => `
                <button type="button" class="cp-pill${year === latestCharityYear ? " is-active" : ""}"
                        data-year="${year}" aria-pressed="${year === latestCharityYear}">
                    ${year === "all" ? "All" : year}
                </button>
            `).join("");


    filters
        .querySelectorAll("[data-year]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    latestCharityYear = button.dataset.year;

                    latestCharityPage = 1;

                    renderLatestCharity();

                }
            );

        });

}


/* ---------- Impact figures (from past campaigns) ---------- */

function renderCharityImpact() {

    const box =
        document.getElementById("cpImpact");


    if (!box) {
        return;
    }


    const raised =
        latestCharityData.reduce(
            (sum, charity) => sum + ((getCharityFundraising(charity) || {}).raised || 0),
            0
        );

    const volunteers =
        latestCharityData.reduce(
            (sum, charity) => sum + asCharityArray(charity.volunteers).length,
            0
        );

    const partners =
        new Set(
            latestCharityData.flatMap(charityPartnerNames).map(name => name.toLowerCase())
        ).size;


    const figures = [
        { value: raised, label: "Raised", money: true },
        { value: latestCharityData.length, label: "Campaigns led" },
        { value: volunteers, label: "Volunteers" },
        { value: partners, label: "Partners" }
    ];


    const format = (figure, value) =>
        figure.money
            ? formatCharityMoneyShort(value, "NGN")
            : Math.round(value).toLocaleString("en-NG");


    box.innerHTML =
        figures.map((figure, index) => `
            <div class="cp-figure">
                <strong data-figure="${index}">${format(figure, 0)}</strong>
                <span>${figure.label}</span>
            </div>
        `).join("");


    const numbers =
        box.querySelectorAll("[data-figure]");


    const reduceMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    if (reduceMotion) {

        numbers.forEach((node, i) => {
            node.textContent = format(figures[i], figures[i].value);
        });

        return;
    }


    const duration = 1800;

    const start = performance.now();


    const tick = now => {

        const progress =
            Math.min(1, (now - start) / duration);

        const eased =
            1 - Math.pow(1 - progress, 3);


        numbers.forEach((node, i) => {
            node.textContent = format(figures[i], figures[i].value * eased);
        });


        if (progress < 1) {
            requestAnimationFrame(tick);
        }

    };


    requestAnimationFrame(tick);

}


/* ---------- Readers' ideas ---------- */

let charityDeviceIdMemory = "";


function getCharityDeviceId() {

    const make = () =>
        (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;


    try {

        let id =
            localStorage.getItem("tnpDeviceId");


        if (!id) {

            id = make();

            localStorage.setItem("tnpDeviceId", id);

        }


        return id;

    } catch {

        charityDeviceIdMemory =
            charityDeviceIdMemory || make();

        return charityDeviceIdMemory;

    }

}


async function loadCharityIdeas() {

    const box =
        document.getElementById("cpIdeas");


    if (!box) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/ideas?deviceId=${encodeURIComponent(getCharityDeviceId())}`
            );


        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }


        const data =
            await response.json();


        charityIdeas =
            Array.isArray(data.ideas) ? data.ideas : [];

    } catch (error) {

        console.error("Failed to load ideas:", error);

        charityIdeas = [];

    }


    renderCharityIdeas();

    renderUpcomingCharity();

}


function renderCharityIdeaItem(idea, index) {

    const e =
        escapeCharityHtml;


    return `
        <li class="cp-idea" data-idea="${idea.id}">
            <span class="cp-idea-rank">${index + 1}</span>
            <div class="cp-idea-body">
                <h3 class="cp-idea-title">${e(idea.title)}</h3>
                <p class="cp-idea-meta">${e(idea.anonymous || !idea.author ? "Anonymous" : idea.author)} · ${e([idea.location, idea.category].filter(Boolean).join(" · "))}</p>
                <div class="cp-idea-bar"><span style="width: ${Math.min(100, idea.votes / idea.goal * 100)}%"></span></div>
                <p class="cp-idea-count">${renderCharityIdeaCount(idea)}</p>
            </div>
            <button type="button" class="cp-heart${idea.votedByMe ? " is-voted" : ""}"
                    aria-pressed="${idea.votedByMe}" aria-label="Vote for “${e(idea.title)}”">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"/>
                </svg>
            </button>
        </li>
    `;

}


function bindCharityIdeaHearts(root) {

    root
        .querySelectorAll(".cp-heart")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => toggleCharityIdeaVote(
                    Number(button.closest("[data-idea]").dataset.idea),
                    button
                )
            );

        });

}


function renderCharityIdeas() {

    const box =
        document.getElementById("cpIdeas");


    if (!box) {
        return;
    }


    const top =
        charityIdeas.slice(0, 4);


    box.innerHTML = `
        <div class="cp-ideas-wrap">

            ${top.length
                ? `<ol class="cp-ideas">${top.map(renderCharityIdeaItem).join("")}</ol>`
                : `<p class="cp-empty">No ideas yet. Be the first to propose one.</p>`}

            <p class="cp-idea-error" role="status" aria-live="polite"></p>

            <button type="button" class="cp-btn cp-btn--navy cp-propose" data-propose>
                + Propose an idea · $1
            </button>

            ${charityIdeas.length > top.length ? `
                <button type="button" class="cp-link" data-ideas-all>
                    See all proposals (${charityIdeas.length}) →
                </button>
            ` : ""}

        </div>
    `;


    bindCharityIdeaHearts(box);

    box.querySelector("[data-propose]").addEventListener("click", openCharityProposalForm);

    box.querySelector("[data-ideas-all]")?.addEventListener("click", openCharityIdeasModal);

}


/* ---------- Simple modal built on the donation modal styles ---------- */

function openCharityModal(content, onClose) {

    const modal =
        document.createElement("div");

    modal.className =
        "donation-modal cp-modal active";

    modal.setAttribute("role", "dialog");

    modal.setAttribute("aria-modal", "true");


    modal.innerHTML = `
        <div class="donation-modal-content">
            <button type="button" class="donation-close" aria-label="Close">×</button>
            ${content}
        </div>
    `;


    const opener =
        document.activeElement;


    const close = () => {

        document.removeEventListener("keydown", onKey);

        modal.remove();

        document.body.style.overflow = "";

        if (onClose) onClose();

        opener?.focus?.();

    };


    const onKey = event => {
        if (event.key === "Escape") close();
    };


    modal.querySelector(".donation-close").addEventListener("click", close);

    modal.addEventListener("click", event => {
        if (event.target === modal) close();
    });

    document.addEventListener("keydown", onKey);


    document.body.appendChild(modal);

    document.body.style.overflow = "hidden";

    modal.querySelector(".donation-close").focus();


    return { modal, close };

}


/* ---------- All proposals ---------- */

function openCharityIdeasModal() {

    let category = "All";


    const categories =
        ["All", ...new Set(charityIdeas.map(idea => idea.category).filter(Boolean))];


    const { modal, close } =
        openCharityModal(
            `
                <div class="donation-header">
                    <span class="donation-label">Readers' letters</span>
                    <h2>All proposals</h2>
                    <p>Vote ❤ for free. At 5,000 votes, an idea becomes a campaign.</p>
                </div>

                <button type="button" class="cp-btn cp-btn--navy cp-propose" data-propose>
                    + Propose an idea · $1
                </button>

                <div class="cp-filters cp-modal-filters" role="group" aria-label="Filter by category">
                    ${categories.map(name => `
                        <button type="button" class="cp-pill${name === "All" ? " is-active" : ""}" data-category="${escapeCharityHtml(name)}"
                                aria-pressed="${name === "All"}">${escapeCharityHtml(name)}</button>
                    `).join("")}
                </div>

                <div class="cp-ideas-wrap">
                    <ol class="cp-ideas" data-all-ideas></ol>
                    <p class="cp-idea-error" role="status" aria-live="polite"></p>
                </div>
            `,
            renderCharityIdeas
        );


    modal.classList.add("cp-modal--ideas");


    const list =
        modal.querySelector("[data-all-ideas]");


    const draw = () => {

        const shown =
            category === "All"
                ? charityIdeas
                : charityIdeas.filter(idea => idea.category === category);


        list.innerHTML =
            shown.map(idea => renderCharityIdeaItem(idea, charityIdeas.indexOf(idea))).join("");


        bindCharityIdeaHearts(list);

    };


    modal
        .querySelectorAll("[data-category]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    category = button.dataset.category;


                    modal.querySelectorAll("[data-category]").forEach(pill => {
                        const active = pill === button;
                        pill.classList.toggle("is-active", active);
                        pill.setAttribute("aria-pressed", String(active));
                    });


                    draw();

                }
            );

        });


    modal.querySelector("[data-propose]").addEventListener(
        "click",
        () => {

            close();

            openCharityProposalForm();

        }
    );


    draw();

}


/* ---------- Propose an idea ($1) ---------- */

const CHARITY_IDEA_CATEGORIES = [
    "Education", "Water", "Health", "Food",
    "Christmas", "Environment", "Skills", "Other"
];


function openCharityProposalForm() {

    const { modal } =
        openCharityModal(`
            <div class="donation-header">
                <span class="donation-label">Readers' letters</span>
                <h2>Propose an idea</h2>
                <p>
                    Tell us what Today Cares should do next. Your idea is published after
                    review by our newsroom; at 5,000 votes it becomes a campaign.
                </p>
            </div>

            <form class="cp-proposal-form" novalidate>

                <div class="donation-field">
                    <label for="ideaTitle">Your idea</label>
                    <input id="ideaTitle" name="title" maxlength="90" required
                           placeholder="e.g. School shoes for 200 pupils in Kano">
                </div>

                <div class="donation-field">
                    <label for="ideaLocation">Where?</label>
                    <input id="ideaLocation" name="location" maxlength="80" required
                           placeholder="Town, State">
                </div>

                <div class="donation-field">
                    <label for="ideaCategory">Category</label>
                    <select id="ideaCategory" name="category" required>
                        <option value="">Choose a category</option>
                        ${CHARITY_IDEA_CATEGORIES.map(name => `<option>${name}</option>`).join("")}
                    </select>
                </div>

                <div class="donation-field">
                    <label for="ideaWhy">Why does it matter?</label>
                    <textarea id="ideaWhy" name="why" rows="4" maxlength="400" required
                              placeholder="Who will it help, and how?"></textarea>
                </div>

                <div class="donation-field">
                    <label for="ideaName">Your name</label>
                    <input id="ideaName" name="name" maxlength="60" placeholder="Shown with your idea">
                </div>

                <div class="donation-field donation-consent">
                    <label class="donation-checkbox">
                        <input type="checkbox" name="anonymous">
                        Stay anonymous
                    </label>
                </div>

                <div class="donation-field">
                    <label for="ideaEmail">Email <span>(for your payment receipt, never shown)</span></label>
                    <input id="ideaEmail" name="email" type="email" maxlength="120" required
                           placeholder="you@example.com">
                </div>

                <div class="donation-field donation-consent">
                    <label class="donation-checkbox">
                        <input type="checkbox" name="acceptNonRefundable" required>
                        I understand this donation is non-refundable, even if my idea is not selected.
                    </label>
                </div>

                <p class="cp-idea-error cp-form-error" role="alert"></p>

                <button type="submit" class="donation-submit">Pay $1 and send my idea</button>

                <p class="cp-secure">🔒 Secure payment via Flutterwave</p>

            </form>
        `);


    const form =
        modal.querySelector("form");

    const error =
        form.querySelector(".cp-form-error");

    const nameInput =
        form.querySelector("[name=name]");

    const anonymous =
        form.querySelector("[name=anonymous]");


    anonymous.addEventListener(
        "change",
        () => {
            nameInput.disabled = anonymous.checked;
            if (anonymous.checked) nameInput.value = "";
        }
    );


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            error.textContent = "";


            const data =
                Object.fromEntries(new FormData(form));


            const payload = {
                title: String(data.title || "").trim(),
                location: String(data.location || "").trim(),
                category: data.category || "",
                why: String(data.why || "").trim(),
                name: String(data.name || "").trim(),
                anonymous: anonymous.checked,
                email: String(data.email || "").trim(),
                acceptNonRefundable: form.querySelector("[name=acceptNonRefundable]").checked
            };


            if (!payload.title || !payload.location || !payload.category || !payload.why) {
                error.textContent = "Please fill in your idea, the place, the category and why it matters.";
                return;
            }

            if (!payload.anonymous && !payload.name) {
                error.textContent = "Please enter your name or choose to stay anonymous.";
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
                error.textContent = "Please enter a valid email.";
                return;
            }

            if (!payload.acceptNonRefundable) {
                error.textContent = "Please confirm that this donation is non-refundable.";
                return;
            }


            const submit =
                form.querySelector("[type=submit]");

            submit.disabled = true;

            submit.textContent = "Opening secure payment…";


            try {

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/ideas/proposals`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        }
                    );


                const result =
                    await response.json().catch(() => ({}));


                if (!response.ok || !result.checkoutUrl) {
                    throw new Error(result.error || "Unable to start the payment.");
                }


                window.location.href =
                    result.checkoutUrl;

            } catch (requestError) {

                error.textContent = requestError.message;

                submit.disabled = false;

                submit.textContent = "Pay $1 and send my idea";

            }

        }
    );

}


/* Back from Flutterwave after paying for an idea */

async function showIdeaProposalVerification(reference, transactionId) {

    const { modal } =
        openCharityModal(`
            <div class="donation-header">
                <span class="donation-label">Readers' letters</span>
                <h2>Checking your payment…</h2>
                <p data-idea-status>Please wait a moment.</p>
            </div>
        `);


    const title =
        modal.querySelector("h2");

    const text =
        modal.querySelector("[data-idea-status]");


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/ideas/proposals/${encodeURIComponent(reference)}/verify`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ transactionId })
                }
            );


        const result =
            await response.json().catch(() => ({}));


        if (!response.ok) {
            throw new Error(result.error || "We could not check the payment yet.");
        }


        if (result.status === "pending" || result.status === "approved") {

            title.textContent = "Thank you! Your idea was received 💡";

            text.textContent =
                `“${result.title}” will be published after review by our newsroom.`;

        } else if (result.status === "awaiting_payment") {

            title.textContent = "Payment still processing";

            text.textContent =
                "Flutterwave has not confirmed your payment yet. We will publish your idea once it is confirmed.";

        } else {

            title.textContent = "Payment not completed";

            text.textContent =
                "Your idea was not sent because the payment did not go through. You can try again.";

        }

    } catch (requestError) {

        title.textContent = "We could not check your payment";

        text.textContent = requestError.message;

    }

}




function renderCharityIdeaCount(idea) {

    const left =
        idea.goal - idea.votes;


    const extra =
        idea.chosen
            ? `<span class="cp-idea-chosen">⭐ Chosen by the community</span>`
            : idea.votes >= 4000
                ? `<span class="cp-idea-hot">🔥 only ${left.toLocaleString("en-NG")} to go</span>`
                : "";


    return `
        <strong>${idea.votes.toLocaleString("en-NG")}</strong>
        / ${idea.goal.toLocaleString("en-NG")} ❤
        ${extra}
    `;

}


async function toggleCharityIdeaVote(ideaId, button) {

    const idea =
        charityIdeas.find(item => item.id === ideaId);


    if (!idea || button.disabled) {
        return;
    }


    const voting =
        !idea.votedByMe;

    const row =
        button.closest(".cp-idea");

    const error =
        button.closest(".cp-ideas-wrap")?.querySelector(".cp-idea-error");


    /* Optimistic update */

    const applyLocal = (voted, votes) => {

        idea.votedByMe = voted;

        idea.votes = votes;

        idea.chosen = votes >= idea.goal;

        button.classList.toggle("is-voted", voted);

        button.setAttribute("aria-pressed", String(voted));

        row.querySelector(".cp-idea-count").innerHTML =
            renderCharityIdeaCount(idea);

        row.querySelector(".cp-idea-bar span").style.width =
            `${Math.min(100, votes / idea.goal * 100)}%`;

    };


    const before =
        { voted: idea.votedByMe, votes: idea.votes };


    applyLocal(voting, idea.votes + (voting ? 1 : -1));

    if (error) error.textContent = "";


    if (voting) {
        playCharityHeart(button);
    }


    button.disabled = true;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/ideas/${ideaId}/vote`,
                {
                    method: voting ? "POST" : "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deviceId: getCharityDeviceId() })
                }
            );


        const data =
            await response.json().catch(() => ({}));


        if (!response.ok) {
            throw new Error(data.error || "Your vote could not be saved.");
        }


        applyLocal(data.idea.votedByMe, data.idea.votes);


        if (before.votes < idea.goal && idea.votes >= idea.goal) {
            renderUpcomingCharity();
        }

    } catch (requestError) {

        applyLocal(before.voted, before.votes);

        if (error) error.textContent = requestError.message;

    } finally {

        button.disabled = false;

    }

}


function playCharityHeart(button) {

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }


    button.classList.remove("is-beating");

    void button.offsetWidth;

    button.classList.add("is-beating");


    [-14, -4, 6, 16].forEach((x, i) => {

        const heart =
            document.createElement("span");

        heart.className = "cp-heart-fly";

        heart.textContent = "❤";

        heart.style.setProperty("--x", `${x}px`);

        heart.style.animationDelay = `${i * 70}ms`;

        button.appendChild(heart);

        setTimeout(() => heart.remove(), 1300);

    });

}


/* ---------- Thank-you band ---------- */

function charityShortName(name) {

    const parts =
        String(name || "").trim().split(/\s+/);


    return parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
        : parts[0] || "";

}


async function renderCharityThanksBand() {

    const band =
        document.getElementById("cpThanks");


    if (!band) {
        return;
    }


    const recent =
        latestCharityData.slice(0, 6);


    const donorLists =
        await Promise.all(
            recent.map(charity =>
                fetch(`${API_BASE_URL}/api/charities/${encodeURIComponent(charity.id)}/donors`)
                    .then(response => response.ok ? response.json() : { donors: [] })
                    .then(data =>
                        Array.isArray(data.donors) && data.donors.length
                            ? data.donors
                            : asCharityArray(charity.donors)
                    )
                    .catch(() => asCharityArray(charity.donors))
            )
        );


    const items = [];


    recent.forEach((charity, index) => {

        donorLists[index].forEach(donor => {
            items.push(
                `<li>❤ <strong>${escapeCharityHtml(donor.anonymous || !donor.name ? "Anonymous" : charityShortName(donor.name))}</strong> donor</li>`
            );
        });


        asCharityArray(charity.volunteers).forEach(volunteer => {
            items.push(
                `<li>🙋 <strong>${escapeCharityHtml(charityShortName(volunteer.name))}</strong> volunteer</li>`
            );
        });

    });


    if (!items.length) {
        return;
    }


    band.innerHTML = `
        <span class="cp-thanks-label">❤ Thank you</span>
        <div class="cp-thanks-window">
            <ul class="cp-thanks-track" style="--cp-thanks-time: ${Math.max(40, items.length * 3)}s">${items.join("")}</ul>
            <ul class="cp-thanks-track" aria-hidden="true" style="--cp-thanks-time: ${Math.max(40, items.length * 3)}s">${items.join("")}</ul>
        </div>
    `;

    band.hidden = false;

}


/* ---------- Partners ---------- */

function renderCharityPartnersRow(charities) {

    const row =
        document.getElementById("cpPartners");


    if (!row) {
        return;
    }


    const seen =
        new Map();


    charities.forEach(charity => {

        asCharityArray(charity.partners).forEach(partner => {

            const key =
                String(partner.name || "").trim().toLowerCase();


            if (key && key !== "partner name" && !seen.has(key)) {
                seen.set(key, partner);
            }

        });

    });


    if (!seen.size) {
        return;
    }


    const e =
        escapeCharityHtml;


    row.innerHTML = `
        <p class="cp-partners-title">In partnership with</p>
        <ul>
            ${[...seen.values()].map(partner => {

                const inner =
                    partner.logo
                        ? `<img src="${e(getImagePath(partner.logo))}" alt="${e(partner.name)}" loading="lazy">`
                        : `<span>${e(partner.name)}</span>`;

                return `<li>${partner.url
                    ? `<a href="${e(partner.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
                    : inner}</li>`;

            }).join("")}
        </ul>
    `;

    row.hidden = false;

}


function renderCharityHome(charities) {

    if (!document.getElementById("cpImpact")) {
        return;
    }


    renderCharityImpact();

    renderCharityThanksBand();

    renderCharityPartnersRow(charities);

    loadCharityIdeas();

}


/* =====================================================
   FORMAT DATE
===================================================== */

function formatCharityDate(dateString) {

    const date = new Date(dateString);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Date unavailable";

    }


    return date.toLocaleDateString(
        "en-NG",
        {
            year:
                "numeric",

            month:
                "long",

            day:
                "numeric"
        }
    );

}

/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const detailContainer =
            document.getElementById(
                "charityDetail"
            );


        const upcomingContainer =
            document.getElementById(
                "upcomingDetail"
            );


        if (upcomingContainer) {

            loadCharityDetail(
                upcomingContainer,
                renderUpcomingWork
            );

        } else if (detailContainer) {

            loadCharityDetail(
                detailContainer
            );

        } else {

            loadCharity();

        }

        initCharityNav();

        handleFlutterwaveRedirect();

    }
);