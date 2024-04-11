import React, { useState, useEffect } from 'react';
import './App.css';
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { DescribeSeverityLevelsCommand, DescribeServicesCommand } from "@aws-sdk/client-support";
import { OrganizationsClient , DescribeOrganizationCommand } from "@aws-sdk/client-organizations";
import  client  from './client.js';
import ErrorBanner from './component/ErrorBanner.js';
import { SupportClient } from "@aws-sdk/client-support";

function CaseCreationForm() {
  const [formData, setFormData] = useState({
    workloadAccount: '',
    issueType: '',
    service: '',
    category: '',
    severity: '',
    subject: '',
    description: '',
    attachment: [],
    additionalContacts: ''
  });

  const [services, setServices] = useState([]);
  const [severities, setSeverities] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [managementAccount, setManagementAccount] = useState('');

  useEffect(() => {
    async function fetchServices() {
      try {
        const params = {
          Language: 'en',
          ServiceCodeList: ['all']
        };
        const command = new DescribeServicesCommand(params);
        const data = await client.send(command);
        const serviceNames = data.services.map(service => service.code);
        setServices(serviceNames);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    }

    async function fetchSeverities() {
      try {
        const command = new DescribeSeverityLevelsCommand({});
        const data = await client.send(command);
        const severityCodes = data.severityLevels.map(severity => severity.code);
        setSeverities(severityCodes);
      } catch (error) {
        console.error('Error fetching severities:', error);
      }
    }
    fetchServices();
    fetchSeverities();
  }, []);

  useEffect(() => {
    // Automatically update the workloadAccount to the management account if it's not already set
    if (managementAccount && !formData.workloadAccount) {
      setFormData({ ...formData, workloadAccount: managementAccount });
    }
  }, [managementAccount, formData.workloadAccount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      attachment: [...e.target.files]
    });
  };

  const handleReview = (e) => {
    e.preventDefault();
    setIsReviewing(true);
  };

  const handleCancelReview = (e) => {
    e.preventDefault();
    setIsReviewing(false);
    setSubmitError(null); // Clear the submit error
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const organizationsClient = new OrganizationsClient({
        region: 'us-east-1',
        credentials: client.config.credentials
      });
      
      const command = new DescribeOrganizationCommand({});
    const data = await organizationsClient.send(command);
    const masterAccountId = data?.Organization?.MasterAccountId;
    if (masterAccountId) {
      setManagementAccount(masterAccountId);
      console.log('Management Account ID:', masterAccountId);
    } else {
      console.error('Master Account ID not found in response:', data);
    }
  
      // Assume a role in the management account only if necessary
      if (formData.workloadAccount !== managementAccount) {
        const assumeRoleParams = {
          RoleArn: 'arn:aws:iam::707187469504:role/CrossAccountSupportRole',
          RoleSessionName: 'CrossAccountSupportRole'
        };
        const stsClient = new STSClient({
          region: 'us-east-1',
          credentials: client.config.credentials, // Use existing credentials
        });
        try {
          const assumedRole = await stsClient.send(new AssumeRoleCommand(assumeRoleParams));
          const credentials = assumedRole.Credentials;

          // Use the assumed credentials to create a support case
          const supportClient = new SupportClient({
            region: 'us-east-1',
            credentials: {
              accessKeyId: credentials.AccessKeyId,
              secretAccessKey: credentials.SecretAccessKey,
              sessionToken: credentials.SessionToken
            }
          });

          const params = {
            subject: formData.subject,
            serviceCode: formData.service,
            severityCode: formData.severity,
            categoryCode: formData.category,
            communicationBody: formData.description,
            attachmentSet: formData.attachment.map(file => ({
              fileName: file.name,
              data: file
            })),
            ccEmailAddresses: formData.additionalContacts.split(',').map(email => email.trim())
          };

          const data = await supportClient.createCase(params).promise();

          console.log('Case created:', data);
          setFormData({
            workloadAccount: '',
            issueType: '',
            service: '',
            category: '',
            severity: '',
            subject: '',
            description: '',
            attachment: [],
            additionalContacts: ''
          });
          alert('Case created successfully!');
        } catch (error) {
          console.error('Error creating case:', error);
          alert('Failed to create case. Please try again later.');
        }
      } else {
        alert('No need to assume role. Workload account is the same as the management account.');
      }
    } catch (error) {
      console.error('Error fetching management account:', error);
      alert('Failed to fetch management account. Please try again later.');
    }
};

  return (
    <div className="container">
      <h2>Case Creation Form</h2>
      <div className="form-box">
        {!isReviewing ? (
          <form onSubmit={handleReview}>
            <div className="form-group">
              <label htmlFor="workload_account">Workload Account:</label>
              <input type="text" id="workload_account" name="workloadAccount" value={formData.workloadAccount} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="issue_type">Issue Type:</label>
              <select id="issue_type" name="issueType" value={formData.issueType} onChange={handleChange} required>
                <option value="">Select</option>
                <option value="Technical">Technical</option>
                <option value="Account and Billing">Account and Billing</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="service">Service:</label>
              <select id="service" name="service" value={formData.service} onChange={handleChange} required>
                <option value="">Select</option>
                {services.map((service, index) => (
                  <option key={index} value={service}>{service}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="category">Category:</label>
              <input type="text" id="category" name="category" value={formData.category} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="severity">Severity:</label>
              <select id="severity" name="severity" value={formData.severity} onChange={handleChange} required>
                <option value="">Select</option>
                {severities.map((severity, index) => (
                  <option key={index} value={severity}>{severity}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="subject">Subject:</label>
              <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="attachment">Attach Files:</label>
              <input type="file" id="attachment" name="attachment" onChange={handleFileChange} multiple />
            </div>
            <div className="form-group">
              <label htmlFor="additional_contacts">Additional Contacts:</label>
              <input type="text" id="additional_contacts" name="additionalContacts" value={formData.additionalContacts} onChange={handleChange} />
            </div>
            <button type="submit">Review</button>
          </form>
        ) : (
          <div>
            <h3>Review</h3>
            <p>Workload Account: {formData.workloadAccount}</p>
            <p>Issue Type: {formData.issueType}</p>
            <p>Service: {formData.service}</p>
            <p>Category: {formData.category}</p>
            <p>Severity: {formData.severity}</p>
            <p>Subject: {formData.subject}</p>
            <p>Description: {formData.description}</p>
            <p>Additional Contacts: {formData.additionalContacts}</p>
            <div className="button-group">
              <button onClick={handleCancelReview}>Edit</button>
              <button onClick={handleSubmit}>Submit</button>
            </div>
          </div>
        )}
      </div>
      {submitError && <ErrorBanner message={submitError} />} {/* Error banner */}
    </div>
  );
}

export default CaseCreationForm;
