module.exports = {
    jwt: () => {
        return 'MY-SECRET'
    },
    simple_crypto: () => {
        return 'MY-SECRET'
    },
    firebase_admin_sdk: () => {
        return {
            development: {
                sdk: {
                    // PASTE SDK
                },
                databaseURL: {
                    // PASTE URL
                }
            },
            production: {
                sdk: {
                    // PASTE SDK
                },
                databaseURL: {
                    // PASTE URL
                }
            }
        }
    }
}