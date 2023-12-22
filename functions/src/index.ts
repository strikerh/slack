/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import * as logger from "firebase-functions/logger";
// import * as functions from "firebase-functions";
import axios from "axios";

const slackTokenHeaders = {
    // eslint-disable-next-line max-len
    headers: { Authorization: "Bearer xoxb-4591539097669-6382155345314-FpE8GJsYan5EDlVJ1U3XVk29" },
};



admin.initializeApp();

// eslint-disable-next-line require-jsdoc
async function postMessage(data: { channel: string; text: string; }) {

    return await axios.post("https://slack.com/api/chat.postMessage", { ...data, link_names: true }, slackTokenHeaders);
}


async function getUserName(userId: string): Promise<string> {
    try {
        const response = await axios.get(`https://slack.com/api/users.info?user=${userId}`, slackTokenHeaders);
        return response.data.user.name.toString(); // Adjust depending on the response structure
    } catch (error) {
        logger.error("Error retrieving user name: ", error);
        return 'unknown';
    }
}


export const slackBot2 = onRequest(async (request, response) => {

    try {

        const slackEvent = request.body.event;


        if (slackEvent.channel === 'C05QWV59KDG') {
            return
        }
        let userName = null;
        if (slackEvent && slackEvent.user) {
            userName = await getUserName(slackEvent.user);
        }



        const documentRef = admin.firestore().collection('slack_responses_' + slackEvent.channel).doc(Date.now().toString());
        await documentRef.set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            zresponse: request.body,
            text: request.body.event.text,
            senderName: userName
        });

        const channelDocRef = admin.firestore().collection('keys').doc(slackEvent.channel);
        try {
            const docSnapshot = await channelDocRef.get();

            if (docSnapshot.exists) {
                // Get the existing data
                const docData = docSnapshot.data();

                // Modify the data
                if (!docData[request.body.event.text])
                    docData[request.body.event.text] = 'unknown';

                // Update the document
                await channelDocRef.set(docData);
            } else {
                // Document does not exist, create a new one with the required data
                const newData = { [request.body.event.text]: 'unknown' };
                await channelDocRef.set(newData);
            }
        } catch (error) {
            console.error("Error updating Firestore document: ", error);
            // Handle the error appropriately
        }

        // Process the Slack event
        // Example: Respond to a specific message or command
        if (slackEvent.type === "url_verification") {
            // URL verification logic for Slack
            response.send({ challenge: slackEvent.challenge });
        } else {
            // Handle other events like messages or commands
            // Example: Send a message to a Slack channel
            const res = postMessage({
                channel: "C05QWV59KDG",
                text: "Hello from Firebase!",
            });

            response.send({ ...res });
        }
    } catch (error) {
        console.error(error);
        response.status(500).send("An error occurred");
    }
});


