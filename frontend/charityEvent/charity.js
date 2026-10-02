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
   RENDER UPCOMING
===================================================== */

function renderUpcomingCharity() {

    const container =
        document.getElementById(
            "upcomingCharity"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !upcomingCharityData.length
    ) {

        container.innerHTML = `
            <div class="charity-empty">
                <p>
                    No upcoming activities available.
                </p>
            </div>
        `;

        return;
    }


    const start =
        (
            upcomingCharityPage -
            1
        ) *
        CHARITY_PER_PAGE;


    const end =
        start +
        CHARITY_PER_PAGE;


    const pageItems =
        upcomingCharityData.slice(
            start,
            end
        );


    renderCharityCards(
        pageItems,
        container,
        true
    );


    renderCharityPagination(
        container,
        upcomingCharityData.length,
        upcomingCharityPage,
        page => {

            upcomingCharityPage =
                page;

            renderUpcomingCharity();

        }
    );

}


/* =====================================================
   RENDER LATEST
===================================================== */

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


    if (
        !latestCharityData.length
    ) {

        container.innerHTML = `
            <div class="charity-empty">
                <p>
                    No latest activities available.
                </p>
            </div>
        `;

        return;
    }


    const start =
        (
            latestCharityPage -
            1
        ) *
        CHARITY_PER_PAGE;


    const end =
        start +
        CHARITY_PER_PAGE;


    const pageItems =
        latestCharityData.slice(
            start,
            end
        );


    renderCharityCards(
        pageItems,
        container,
        false
    );


    renderCharityPagination(
        container,
        latestCharityData.length,
        latestCharityPage,
        page => {

            latestCharityPage =
                page;

            renderLatestCharity();

        }
    );

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
                                            Donate
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
                        function () {

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


                            const now =
                                new Date();


                            if (
                                now >=
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
                    );

                }

            }


            container.appendChild(
                card
            );

        }
    );

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

        loadCharity();

        handleFlutterwaveRedirect();

    }
);