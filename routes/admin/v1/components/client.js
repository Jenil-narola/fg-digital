const client = require('express').Router(),
    firebase = require('firebase-admin'),
    { response, bcryptHash, bcryptHashCompare, randomIntDigit } = require('../functions/functions'),
    fs = require('fs'),
    regex = require('../functions/regex')


//----------------------------- CONFIGURATION ------------------------------

//---------------------------- GLOBAL VARIABLE -----------------------------
var dbAdminSnapshot, adminAuthToken;
client.use((req, res, next) => {
    dbAdminSnapshot = req.session.dbAdminSnapshot
    adminAuthToken = req.session.decode_adminAuthToken
    next();
});
//--------------------------------- ROUTES ---------------------------------

//------------------------------- 4. CLIENT -------------------------------

// 4.1 CREATE CLIENT ID
client.post('/create', async(req, res) => {
    if (!req.body.name || !req.body.email || !req.body.password) {
        return response(res, 400, 'Body required', 'name,email or password missing', undefined, 'A-4.1.1')
    }
    var name = String(req.body.name).trim(),
        email = String(req.body.email).trim().toLowerCase(),
        password = String(req.body.password)
    password = await bcryptHash(password)
    if (!regex.email(email)) {
        return response(res, 400, 'invalid', 'Email value is invalid', undefined, 'A-4.1.2')
    }

    var pushData = {
        name: name,
        email: email,
        password: bcryptHash(password),
        createdOn: String(new Date()),
        createdBy: "ADMIN"
    }
    if (dbAdminSnapshot.clients) {
        var clientDB = dbAdminSnapshot.clients,
            clientKey = Object.keys(clientDB)
        for (var i = 0; i < clientKey.length; i++) {
            if (clientDB[clientKey[i]].email == email) {
                return response(res, 403, 'forbidden', 'Client With This Email Is Already Exist', undefined, 'A-4.1.3')
            } else if (i == clientKey.length - 1) {
                firebase.database().ref('/admin/clients/').push(pushData)
                return response(res, 200, 'success', 'User created successfully', undefined, 'A-4.1.4')
            }
        }

    }
    firebase.database().ref('/admin/clients/').push(pushData).then(() => {
        return response(res, 200, 'success', 'User created successfully', undefined, 'A-4.1.5')

    })
})

// 4.2 Profile Update
client.post('/update', (req, res) => {
    var pushData = {}
    if (dbAdminSnapshot.clients) {
        var clientDB = dbAdminSnapshot.clients,
            clientKey = Object.keys(clientDB)
        if (!req.body.clientID) {
            return response(res, 400, 'invalid', 'invalid Client Key', undefined, 'A-4.2.1')
        }
        var clientID = String(req.body.clientID).trim()
        if (!clientKey.includes(clientID)) {
            return response(res, 400, 'invalid', 'invalid Client Key', undefined, 'A-4.2.2')
        }
        if (req.body.name) {
            var name = String(req.body.name).trim()
            pushData.name = name
        }
        if (req.body.email) {
            var email = String(req.body.email).trim().toLowerCase()
            for (var i = 0; i < clientKey.length; i++) {
                if (clientDB[clientKey[i]].email == email && !clientDB[clientKey[i]].deleted) {
                    return response(res, 403, 'forbidden', 'Client With This Email Is Already Exist', undefined, 'A-4.2.3')
                } else if (i == clientKey.length - 1) {
                    pushData.email = email
                }
            }
        }
        if (pushData && !clientDB[clientID].deleted) {
            pushData.lastModifiedOn = String(new Date())
            pushData.lastModifiedBy = "ADMIN"
            firebase.database().ref(`/admin/clients/${clientID}/`).update(pushData).then(() => {
                return response(res, 200, 'success', 'Profile Updated Successfully', undefined, 'A-4.2.4')
            })
        } else {
            return response(res, 404, 'forbidden', undefined, undefined, 'A-4.2.5')

        }
    } else {
        return response(res, 404, 'forbidden', 'Not Found Client', undefined, 'A-4.2.6')

    }

});

// 4.3 DELETE CLIENT
client.post('/delete', (req, res) => {
    if (!dbAdminSnapshot.clients) {
        return response(res, 404, 'forbidden', 'Not Found Client', undefined, 'A-4.3.1')
    }
    var clientDB = dbAdminSnapshot.clients,
        clientKey = Object.keys(clientDB),
        clientID = String(req.body.clientID).trim()
    if (!req.body.clientID || !clientKey.includes(clientID)) {
        return response(res, 400, 'invalid', 'invalid Client Key', undefined, 'A-4.3.2')
    }

    if (!clientDB[clientID].deleted) {
        firebase.database().ref(`/admin/clients/${clientID}/`).update({ "deleted": true, "lastModifiedOn": String(new Date()), "lastModifiedBy": "ADMIN" }).then(() => {
            return response(res, 200, 'success', 'Profile Updated Successfully', undefined, 'A-4.3.3')
        })
    } else {
        return response(res, 403, 'forbidden', 'Client Account is already deleted', undefined, 'A-4.3.4')
    }

});

// 4.4 ADD PLAN
client.post('/plan/add', (req, res) => {
    if (!dbAdminSnapshot.clients) {
        return response(res, 404, 'forbidden', 'Not Found Client', undefined, 'A-4.4.1')
    }
    var pushData = {},
        clientDB = dbAdminSnapshot.clients,
        clientKey = Object.keys(clientDB),
        plan_id = Math.floor(new Date().valueOf() * Math.random())
    if (!req.body.plan || !req.body.start_date || !req.body.duration || !req.body.clientID) {
        return response(res, 400, 'invalid', 'Input Data properly', undefined, 'A-4.4.2')
    }
    var clientID = String(req.body.clientID).trim()
    if (!clientKey.includes(clientID)) {
        return response(res, 400, 'invalid', 'invalid Client Key', undefined, 'A-4.4.3')
    }
    var plan = String(req.body.plan),
        startDate = String(req.body.start_date),
        duration = String(req.body.duration)
    if (String(new Date(startDate)) == "Invalid Date") {
        return response(res, 400, 'invalid', 'Invalid Date', undefined, 'A-4.5.7')
    }
    if (req.body.price) {
        var price = String(req.body.price)
        if (isNaN(price)) {
            return response(res, 400, 'invalid', 'Price Value invalid', undefined, 'A-4.4.4')
        }
        pushData = {
            price: price
        }
    }
    if (isNaN(duration)) {
        return response(res, 400, 'invalid', 'Duration Value invalid', undefined, 'A-4.4.5')
    }
    pushData = {
        start_date: startDate,
        plan: plan,
        duration: duration,
        createdBy: "ADMIN",
        createdOn: String(new Date()),
        project_id: plan_id
    }
    firebase.database().ref(`/admin/clients/${clientID}/plans/`).push(pushData).then(() => {
        return response(res, 200, 'success', 'Profile Updated Successfully', undefined, 'A-4.4.6')
    })
});

// 4.5 UPDATE PLAN
client.post('/plan/update', (req, res) => {
    if (!dbAdminSnapshot.clients) {
        return response(res, 404, 'forbidden', 'Not Found Client', undefined, 'A-4.5.1')
    }
    var clientDB = dbAdminSnapshot.clients,
        clientKey = Object.keys(clientDB),
        clientID = String(req.body.clientID),
        pushData = {}
    if (!req.body.clientID || !clientKey.includes(clientID)) {
        return response(res, 400, 'invalid', 'invalid Client Key', undefined, 'A-4.5.2')
    }
    var planDB = clientDB[clientID].plans,
        planKey = Object.keys(planDB),
        planID = String(req.body.planID)
    if (!req.body.planID || !planKey.includes(planID)) {
        return response(res, 400, 'invalid', 'invalid Plan Key', undefined, 'A-4.5.3')
    }
    if (req.body.plan) {
        var plan = String(req.body.plan)
        pushData.plan = plan
    }
    if (req.body.start_date) {
        if (String(new Date(req.body.start_date)) == "Invalid Date") {
            return response(res, 400, 'invalid', 'Invalid Date', undefined, 'A-4.5.5')
        }
        var startDate = String(req.body.start_date)
        pushData.start_date = startDate
    }
    if (req.body.duration) {
        var duration = String(req.body.duration)
        if (isNaN(duration)) {
            return response(res, 400, 'invalid', 'Duration Value invalid', undefined, 'A-4.5.4')
        }
        pushData.duration = duration
    }
    if (req.body.price) {
        var price = String(req.body.price)
        if (isNaN(price)) {
            return response(res, 400, 'invalid', 'Price Value invalid', undefined, 'A-4.5.7')
        }
        pushData.price = price
    }

    if (!clientDB[clientID].plans[planID].deleted) {
        pushData.lastModifiedOn = String(new Date())
        pushData.lastModifiedBy = "ADMIN"
        firebase.database().ref(`/admin/clients/${clientID}/plans/${planID}/`).update(pushData).then(() => {
            return response(res, 200, 'success', 'Plan Successfully Updated', undefined, 'A-4.5.8')
        })
    } else {
        return response(res, 403, 'forbidden', 'Plan Is Deleted Or Not Available', undefined, 'A-4.5.9')
    }


});

// 4.6 DELETE PLAN
client.post('/plan/remove', (req, res) => {
    if (!dbAdminSnapshot.clients) {
        return response(res, 404, 'forbidden', 'Not Found Client', undefined, 'A-4.6.1')
    }
    var clientDB = dbAdminSnapshot.clients,
        clientKey = Object.keys(clientDB),
        clientID = String(req.body.clientID),
        pushData = {
            deleted: true,
            lastModifiedOn: String(new Date()),
            lastModifiedBy: "ADMIN"
        }
    if (!req.body.clientID || !clientKey.includes(clientID)) {
        return response(res, 400, 'invalid', 'invalid Client Key', undefined, 'A-4.6.2')
    }
    var planDB = clientDB[clientID].plans,
        planKey = Object.keys(planDB),
        planID = String(req.body.planID)
    if (!req.body.planID || !planKey.includes(planID)) {
        return response(res, 400, 'invalid', 'invalid Plan Key', undefined, 'A-4.6.3')
    }
    firebase.database().ref(`/admin/clients/${clientID}/plans/${planID}/`).update(pushData).then(() => {
        return response(res, 200, 'success', 'Plan Successfully Removed', undefined, 'A-4.6.4')
    })

})

module.exports = client;