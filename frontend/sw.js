self.addEventListener("push", event => {

    console.log("Push received:", event);

    event.waitUntil(

        (async () => {

            let data = {
                title: "Today Newspaper",
                body: "You have a donation reminder."
            };

            try {

                if (event.data) {
                    data = event.data.json();
                }

            } catch (error) {

                console.error(
                    "Unable to read push data:",
                    error
                );

            }

            console.log(
                "Notification data:",
                data
            );

            await self.registration.showNotification(

                data.title || "Today Newspaper",

                {
                    body:
                        data.body ||
                        "You have a donation reminder.",

                    icon:
                        "/images/logoDefaultMode.PNG",

                    data: {
                        url:
                            data.url ||
                            "/charityEvent/charityEvents.html"
                    }
                }

            );

            console.log(
                "Notification displayed successfully."
            );

        })()

    );

});


self.addEventListener(
    "notificationclick",
    event => {

        console.log(
            "Notification clicked."
        );

        event.notification.close();

        const url =
            event.notification.data?.url ||
            "/charityEvent/charityEvents.html";

        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            })

            .then(windowClients => {

                for (
                    const client of windowClients
                ) {

                    if (
                        "focus" in client
                    ) {

                        client.navigate(url);

                        return client.focus();

                    }

                }

                if (
                    clients.openWindow
                ) {

                    return clients.openWindow(
                        url
                    );

                }

            })

        );

    }
);