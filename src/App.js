import React from 'react';
import { Amplify } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import CaseCreationForm from './component/CaseCreationForm.js';

import awsExports from './aws-exports';
Amplify.configure(awsExports);


function App() {
  return (
    <div className="container">
      <CaseCreationForm />
    </div>
  );
}

export default withAuthenticator(App);
