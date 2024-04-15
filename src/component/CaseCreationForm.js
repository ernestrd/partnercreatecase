import React, { useState, useEffect } from 'react';
import '../App.css';
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { DescribeSeverityLevelsCommand, DescribeServicesCommand , CreateCaseCommand , DescribeCasesCommand  } from "@aws-sdk/client-support";
import { OrganizationsClient , DescribeOrganizationCommand } from "@aws-sdk/client-organizations";
import { getClient } from '../client.js';
import ErrorBanner from './ErrorBanner.js';
import { SupportClient } from "@aws-sdk/client-support";
import { signOut } from 'aws-amplify/auth';

async function initClient() {
    return await getClient();
  }
  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.log('error signing out: ', error);
    }
  }
  
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
  const [categories, setCategories] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [managementAccount, setManagementAccount] = useState('');
  const [allCategories, setAllCategories] = useState([]);

  const fetchCategories = async () => {  
    try {
      const client = await initClient();
      const params = {
        Language: 'en',
        ServiceCodeList: ['all']
      };
      const command = new DescribeServicesCommand(params);
      const data = await client.send(command);
      const categories = data.services.flatMap(service => service.categories.map(category => ({
        serviceCode: service.code,
        categoryCode: category.code,
        categoryName: category.name,
      })));
      setAllCategories(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  useEffect(() => {
    async function fetchServices() {
      try {
        const client = await initClient();
        const params = {
          Language: 'en',
          ServiceCodeList: ['all']
        };
        const command = new DescribeServicesCommand(params);
        const data = await client.send(command);
        const serviceList = data.services.map(service => ({
          code: service.code,
          name: service.name
        }));
        // Sort the services alphabetically
        serviceList.sort((a, b) => a.name.localeCompare(b.name));
        setServices(serviceList);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    }
  
    async function fetchSeverities() {
      try {
        const client = await initClient();
        const command = new DescribeSeverityLevelsCommand({});
        const data = await client.send(command);
        const severityList = data.severityLevels.map(severity => ({
          code: severity.code,
          name: severity.name
        }));
        setSeverities(severityList);
      } catch (error) {
        console.error('Error fetching severities:', error);
      }
    }
  
    fetchCategories();
    fetchServices();
    fetchSeverities();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  
    if (name === 'service') {
      const selectedServiceCategories = allCategories.filter(category => category.serviceCode === value);
      setCategories(selectedServiceCategories);
    }
  
    // Update the category code instead of the name
    if (name === 'category') {
      const selectedCategory = allCategories.find(category => category.categoryName === value);
      if (selectedCategory) {
        setFormData({
          ...formData,
          category: selectedCategory.categoryCode // Update category to category code
        });
      }
    }
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

  const handleSubmit = async () => {
    try {
      // Attempt to create a case using the workload account credentials
      const client = await initClient(); // Initialize the client here
      const response = await client.send(
            new CreateCaseCommand({
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
            })
          );
  
          console.log('Case created:', response);
          setFormData(prevFormData => ({
            // Reset form fields
            ...prevFormData,
            workloadAccount: '',
            issueType: '',
            service: '',
            category: '',
            severity: '',
            subject: '',
            description: '',
            attachment: [],
            additionalContacts: ''
          }));
          setIsReviewing(false); // Exit review mode
          console.log('Case created:', response);
          const caseDetailsResponse = await client.send(
            new DescribeCasesCommand({
              caseId: response.caseId // Assuming response.caseId contains the ID of the created case
            })
          );
          const displayId = caseDetailsResponse?.displayId;
          if (displayId) {
            alert(`Case created successfully! Case ID: ${response.displayId}`);
          } else {
            console.error('Error fetching case details:', caseDetailsResponse);
          }
          setSubmitError(null);
        } catch (error) {
          console.error('Error creating case:', error);
          alert('Access denied when creating case. Assuming role in management account...');

          console.log('Error details:', error.name);
         
        
      if (error.name === 'AccessDeniedException') {
      // If access is denied, assume a role in the management account and try again
      const client = await initClient(); // Initialize the client here
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
          const client = new SupportClient({
            region: 'us-east-1',
            credentials: {
              accessKeyId: credentials.AccessKeyId,
              secretAccessKey: credentials.SecretAccessKey,
              sessionToken: credentials.SessionToken
            }
          });
  
          const response = await client.send(
            new CreateCaseCommand({
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
            })
          );
  
          console.log('Case created:', response);
          setFormData(prevFormData => ({
            // Reset form fields
            ...prevFormData,
            workloadAccount: '',
            issueType: '',
            service: '',
            category: '',
            severity: '',
            subject: '',
            description: '',
            attachment: [],
            additionalContacts: ''
          }));
          setIsReviewing(false); // Exit review mode
          const input = { 
            caseIdList: [
                response.caseId
            ]
          }
          const caseDetailsResponse = await client.send(
            new DescribeCasesCommand(input)
          );
          const displayId = caseDetailsResponse?.cases[0]?.displayId;
          if (displayId) {
            alert(`Case created successfully! Case ID: ${displayId}`);
          } else {
            console.error('Error fetching case details:', caseDetailsResponse);
          }
        }
        catch (error) {
            console.error('Error creating case:', error);
            alert('Failed to create case. Please try again later.');
        }
    
    }
    }
};
    
  return (
    <div className="container">
      <div className="sign-out-container">
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
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
              <select id="service" name="service" value={formData.service} onChange={(e) => { handleChange(e); fetchCategories(e.target.value); }} required>
                <option value="">Select</option>
                {services.map((service, index) => (
                  <option key={index} value={service.code}>{service.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="category">Category:</label>
              <select id="category" name="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select</option>
                {categories.map((category, index) => (
                  <option key={index} value={category.categoryCode}>{category.categoryName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="severity">Severity:</label>
              <select id="severity" name="severity" value={formData.severity} onChange={handleChange} required>
                <option value="">Select</option>
                {severities.map((severity, index) => (
                  <option key={index} value={severity.code}>{severity.name}</option>
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
              <label htmlFor="email_addresses">Email Addresses:</label>
              <input type="text" id="email_addresses" name="additionalContacts" value={formData.additionalContacts} onChange={handleChange} required />
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
