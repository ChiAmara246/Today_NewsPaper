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

function openDonationForm(
    activity
) {

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


                    <button
                        type="submit"
                        class="donation-submit"
                    >
                        Continue
                    </button>

                </form>

            </div>

        `;


        document.body.appendChild(
            donationModal
        );


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


    if (
        !donorName ||
        !email
    ) {

        alert(
            "Please enter your full name and email address."
        );

        return;

    }


    submitButton.disabled =
        true;

    submitButton.textContent =
        "Processing...";


    try {

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
                            message

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
            "Continue";

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
                        Your donation has been
                        recorded as pending.
                    </p>

                </div>


                <div
                    class="donation-payment-details"
                >

                    <p>
                        <strong>
                            Reference
                        </strong>
                    </p>


                    <p
                        class="donation-reference"
                    ></p>


                    <div
                        class="donation-transfer-instructions"
                    >

                        <h3>
                            Bank Transfer
                        </h3>


                        <p>
                            Your payment instructions
                            will appear here once the
                            payment provider is connected.
                        </p>

                    </div>

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

    }


    /* =========================================
       UPDATE REFERENCE
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



/* =====================================================
   PAGINATION
===================================================== */

function renderCharityPagination(
    container,
    totalItems,
    currentPage,
    onPageChange
) {

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

function renderCharityCards(
    charities,
    container,
    showDonate
) {

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

function formatCharityDate(
    dateString
) {

    const date =
        new Date(
            dateString
        );


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

    }
);