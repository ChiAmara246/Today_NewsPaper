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
        document.getElementById("upcomingCharity");

    const latestContainer =
        document.getElementById("latestCharity");


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

        const response = await fetch(`${API_BASE_URL}/api/charities`);

        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        const charities =
            Array.isArray(data.charities)
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


        /* =============================================
           RESET BOTH PAGES
        ============================================= */

        upcomingCharityPage = 1;
        latestCharityPage = 1;


        /* =============================================
           RENDER
        ============================================= */

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


    container.innerHTML = "";


    if (!upcomingCharityData.length) {

        container.innerHTML = `
            <div class="charity-empty">
                <p>
                    No upcoming activities available.
                </p>
            </div>
        `;

        return;
    }


    /* =============================================
       CALCULATE CURRENT PAGE
    ============================================= */

    const start =
        (upcomingCharityPage - 1) *
        CHARITY_PER_PAGE;


    const end =
        start +
        CHARITY_PER_PAGE;


    const pageItems =
        upcomingCharityData.slice(
            start,
            end
        );


    /* =============================================
       RENDER CARDS
    ============================================= */

    renderCharityCards(
        pageItems,
        container,
        true
    );


    /* =============================================
       PAGINATION
    ============================================= */

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


    container.innerHTML = "";


    if (!latestCharityData.length) {

        container.innerHTML = `
            <div class="charity-empty">
                <p>
                    No latest activities available.
                </p>
            </div>
        `;

        return;
    }


    /* =============================================
       CALCULATE CURRENT PAGE
    ============================================= */

    const start =
        (latestCharityPage - 1) *
        CHARITY_PER_PAGE;


    const end =
        start +
        CHARITY_PER_PAGE;


    const pageItems =
        latestCharityData.slice(
            start,
            end
        );


    /* =============================================
       RENDER CARDS
    ============================================= */

    renderCharityCards(
        pageItems,
        container,
        false
    );


    /* =============================================
       PAGINATION
    ============================================= */

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
   SHARED PAGINATION
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


    /* =============================================
       NO PAGINATION IF ONLY ONE PAGE
    ============================================= */

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
       PREV
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


    /* =============================================
       ADD BUTTONS
    ============================================= */

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
                                    <div class="charity-actions">

                                        <button
                                            type="button"
                                            class="charity-reminder"
                                            aria-label="Set reminder"
                                            title="Set reminder"
                                        >
                                            <i class="fa-regular fa-bell"></i>
                                        </button>


                                        <a
                                            href="${
                                                charity.donateUrl || "#"
                                            }"
                                            class="charity-donate"
                                        >
                                            Donate
                                        </a>

                                    </div>
                                  `
                                : ""
                        }

                    </div>

                </div>

            `;


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


    return date.toLocaleDateString(
        "en-NG",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
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