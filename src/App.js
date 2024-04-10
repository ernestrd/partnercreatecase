import React, { useState, useEffect } from 'react';
import './App.css';
import { DescribeSeverityLevelsCommand } from "@aws-sdk/client-support";
import client from './client.js';

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

  useEffect(() => {
    async function fetchServices() {
      // Fetch services code here
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

  const handleChange = (e) => {
    // handleChange code here
  };

  const handleFileChange = (e) => {
    // handleFileChange code here
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    try {
      const data = await client.createCase(params).promise();

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
  };

  return (
    <div className="container">
      <h2>Case Creation Form</h2>
      <div className="form-box">
        <form onSubmit={handleSubmit}>
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
          <button type="submit">Create Case</button>
        </form>
      </div>
    </div>
  );
}

export default CaseCreationForm;