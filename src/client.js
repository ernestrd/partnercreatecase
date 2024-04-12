import { SupportClient } from "@aws-sdk/client-support";
import { fetchAuthSession } from 'aws-amplify/auth';

export const getClient = async () => {
    try {
        const session = await fetchAuthSession();
        const { accessToken, idToken, credentials } = session ?? {};
        if (credentials) {
            const client = new SupportClient({
                region: 'us-east-1',
                credentials: {
                    accessKeyId: credentials.accessKeyId,
                    secretAccessKey: credentials.secretAccessKey,
                    sessionToken: credentials.sessionToken
                }
            });
            return client;
        } else {
            console.error('Credentials are missing in the session.');
            return null;
        }
    } catch (err) {
        console.log(err);
        return null;
    }
}

export default getClient;