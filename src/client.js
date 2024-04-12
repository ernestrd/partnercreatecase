import { SupportClient } from "@aws-sdk/client-support";

const client = new SupportClient({
    region: 'us-east-1',
    credentials: {
    accessKeyId: process.env.REACT_APP_partneraccesskey,
    secretAccessKey: process.env.REACT_APP_partnercasesecretkey
    }
  });

export default client ;
