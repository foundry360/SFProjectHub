#!/usr/bin/env node

/**
 * Salesforce Project Hub Metadata Generator
 * Generates complete SFDX metadata structure for project management platform
 */

const fs = require("fs");
const path = require("path");

class SalesforceMetadataGenerator {
  constructor() {
    this.apiVersion = "59.0";
    this.baseObjectPath = "force-app/main/default/objects";
    this.objectDefinitions = this.getObjectDefinitions();
  }

  /**
   * Main execution function
   */
  async generate() {
    console.log("🚀 Generating Salesforce Project Hub Metadata...\n");

    try {
      // Create base directory structure
      this.createDirectoryStructure();

      // Generate all objects and fields
      for (const objectDef of this.objectDefinitions) {
        await this.generateObject(objectDef);
      }

      console.log("\n✅ Metadata generation completed successfully!");
      console.log(`\n📂 Generated files in: ${this.baseObjectPath}`);
      console.log("\n🚀 Ready for deployment:");
      console.log(
        "   sf project deploy start --source-dir force-app/main/default/objects\n"
      );
    } catch (error) {
      console.error("❌ Error generating metadata:", error);
      process.exit(1);
    }
  }

  /**
   * Create directory structure for all objects
   */
  createDirectoryStructure() {
    console.log("📁 Creating directory structure...");

    this.objectDefinitions.forEach((obj) => {
      const objectDir = path.join(this.baseObjectPath, obj.apiName);
      const fieldsDir = path.join(objectDir, "fields");

      if (!fs.existsSync(objectDir)) {
        fs.mkdirSync(objectDir, { recursive: true });
      }
      if (!fs.existsSync(fieldsDir)) {
        fs.mkdirSync(fieldsDir, { recursive: true });
      }
    });
  }

  /**
   * Generate object metadata and all its fields
   */
  async generateObject(objectDef) {
    console.log(`🔨 Generating ${objectDef.apiName}...`);

    // Generate object metadata
    const objectXml = this.generateObjectXml(objectDef);
    const objectPath = path.join(
      this.baseObjectPath,
      objectDef.apiName,
      `${objectDef.apiName}.object-meta.xml`
    );
    fs.writeFileSync(objectPath, objectXml);

    // Generate field metadata
    for (const field of objectDef.fields) {
      const fieldXml = this.generateFieldXml(field);
      const fieldPath = path.join(
        this.baseObjectPath,
        objectDef.apiName,
        "fields",
        `${field.apiName}.field-meta.xml`
      );
      fs.writeFileSync(fieldPath, fieldXml);
    }

    console.log(
      `   ✓ Created ${objectDef.fields.length} fields for ${objectDef.apiName}`
    );
  }

  /**
   * Generate object XML metadata
   */
  generateObjectXml(objectDef) {
    // Check if this object has Master-Detail relationships
    const hasMasterDetail = objectDef.fields.some(
      (field) => field.type === "MasterDetail"
    );
    const sharingModel = hasMasterDetail ? "ControlledByParent" : "Private";

    return `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <actionOverrides>
        <actionName>Accept</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>CancelEdit</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>Clone</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>Delete</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>Edit</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>List</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>New</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>SaveEdit</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>Tab</actionName>
        <type>Default</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>View</actionName>
        <type>Default</type>
    </actionOverrides>
    <allowInChatterGroups>false</allowInChatterGroups>
    <compactLayoutAssignment>SYSTEM</compactLayoutAssignment>
    <deploymentStatus>Deployed</deploymentStatus>
    <enableActivities>true</enableActivities>
    <enableBulkApi>true</enableBulkApi>
    <enableFeeds>true</enableFeeds>
    <enableHistory>true</enableHistory>
    <enableLicensing>false</enableLicensing>
    <enableReports>true</enableReports>
    <enableSearch>true</enableSearch>
    <enableSharing>true</enableSharing>
    <enableStreamingApi>true</enableStreamingApi>
    <externalSharingModel>${sharingModel === "ControlledByParent" ? "ControlledByParent" : "Private"}</externalSharingModel>
    <label>${objectDef.label}</label>
    <nameField>
        <displayFormat>${objectDef.nameField.displayFormat}</displayFormat>
        <label>${objectDef.nameField.label}</label>
        <type>AutoNumber</type>
    </nameField>
    <pluralLabel>${objectDef.pluralLabel}</pluralLabel>
    <searchLayouts/>
    <sharingModel>${sharingModel}</sharingModel>
    <visibility>Public</visibility>
</CustomObject>`;
  }

  /**
   * Generate field XML metadata
   */
  generateFieldXml(field) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>${field.apiName}</fullName>`;

    // Add field-specific attributes (but not for Lookup/MasterDetail fields)
    if (
      field.defaultValue &&
      field.type !== "Lookup" &&
      field.type !== "MasterDetail"
    ) {
      xml += `\n    <defaultValue>${field.defaultValue}</defaultValue>`;
    }

    if (field.deleteConstraint) {
      xml += `\n    <deleteConstraint>${field.deleteConstraint}</deleteConstraint>`;
    }

    xml += `\n    <externalId>false</externalId>`;

    if (field.formula) {
      xml += `\n    <formula>${field.formula}</formula>`;
      xml += `\n    <formulaTreatBlanksAs>BlankAsZero</formulaTreatBlanksAs>`;
    }

    xml += `\n    <label>${field.label}</label>`;

    if (field.length) {
      xml += `\n    <length>${field.length}</length>`;
    }

    if (field.precision) {
      xml += `\n    <precision>${field.precision}</precision>`;
    }

    if (field.referenceTo) {
      xml += `\n    <referenceTo>${field.referenceTo}</referenceTo>`;
    }

    if (field.relationshipLabel) {
      xml += `\n    <relationshipLabel>${field.relationshipLabel}</relationshipLabel>`;
    }

    if (field.relationshipName) {
      xml += `\n    <relationshipName>${field.relationshipName}</relationshipName>`;
    }

    if (field.relationshipOrder !== undefined) {
      xml += `\n    <relationshipOrder>${field.relationshipOrder}</relationshipOrder>`;
    }

    if (field.reparentableMasterDetail !== undefined) {
      xml += `\n    <reparentableMasterDetail>${field.reparentableMasterDetail}</reparentableMasterDetail>`;
    }

    if (field.type !== "MasterDetail") {
      xml += `\n    <required>${field.required || false}</required>`;
    }

    if (field.scale !== undefined) {
      xml += `\n    <scale>${field.scale}</scale>`;
    }

    xml += `\n    <trackFeedHistory>false</trackFeedHistory>`;
    xml += `\n    <trackHistory>false</trackHistory>`;
    xml += `\n    <trackTrending>false</trackTrending>`;
    xml += `\n    <type>${field.type}</type>`;

    if (field.unique !== undefined) {
      xml += `\n    <unique>${field.unique}</unique>`;
    }

    if (field.valueSet) {
      xml += this.generateValueSet(field.valueSet);
    }

    if (field.visibleLines) {
      xml += `\n    <visibleLines>${field.visibleLines}</visibleLines>`;
    }

    if (field.writeRequiresMasterRead !== undefined) {
      xml += `\n    <writeRequiresMasterRead>${field.writeRequiresMasterRead}</writeRequiresMasterRead>`;
    }

    xml += `\n</CustomField>`;

    return xml;
  }

  /**
   * Generate picklist value set XML
   */
  generateValueSet(valueSet) {
    let xml = `\n    <valueSet>
        <restricted>true</restricted>
        <valueSetDefinition>
            <sorted>false</sorted>`;

    valueSet.values.forEach((value) => {
      xml += `
            <value>
                <fullName>${value}</fullName>
                <default>false</default>
                <label>${value}</label>
            </value>`;
    });

    xml += `
        </valueSetDefinition>
    </valueSet>`;

    if (valueSet.visibleLines) {
      xml += `\n    <visibleLines>${valueSet.visibleLines}</visibleLines>`;
    }

    return xml;
  }

  /**
   * Object definitions with all fields
   */
  getObjectDefinitions() {
    return [
      {
        apiName: "Portfolio__c",
        label: "Portfolio",
        pluralLabel: "Portfolios",
        nameField: {
          displayFormat: "PORTFOLIO-{0000}",
          label: "Portfolio Number"
        },
        fields: [
          {
            apiName: "Portfolio_Name__c",
            label: "Portfolio Name",
            type: "Text",
            length: 255,
            required: true
          },
          {
            apiName: "Description__c",
            label: "Description",
            type: "LongTextArea",
            length: 32768,
            visibleLines: 3
          },
          {
            apiName: "Status__c",
            label: "Status",
            type: "Picklist",
            valueSet: {
              values: ["Planning", "Active", "On Hold", "Completed"]
            }
          },
          {
            apiName: "Budget__c",
            label: "Budget",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            apiName: "Start_Date__c",
            label: "Start Date",
            type: "Date",
            required: true
          },
          {
            apiName: "End_Date__c",
            label: "End Date",
            type: "Date",
            required: true
          },
          {
            apiName: "Owner__c",
            label: "Owner",
            type: "Lookup",
            referenceTo: "User",
            relationshipName: "Portfolios",
            deleteConstraint: "SetNull",
            required: false
          }
        ]
      },
      {
        apiName: "Project__c",
        label: "Project",
        pluralLabel: "Projects",
        nameField: {
          displayFormat: "PROJ-{0000}",
          label: "Project Number"
        },
        fields: [
          {
            apiName: "Project_Name__c",
            label: "Project Name",
            type: "Text",
            length: 255,
            required: true
          },
          {
            apiName: "Description__c",
            label: "Description",
            type: "LongTextArea",
            length: 32768,
            visibleLines: 3
          },
          {
            apiName: "Status__c",
            label: "Status",
            type: "Picklist",
            valueSet: {
              values: [
                "Planning",
                "Active",
                "On Hold",
                "Completed",
                "Cancelled"
              ]
            }
          },
          {
            apiName: "Priority__c",
            label: "Priority",
            type: "Picklist",
            valueSet: {
              values: ["Low", "Medium", "High", "Critical"]
            }
          },
          {
            apiName: "Start_Date__c",
            label: "Start Date",
            type: "Date",
            required: true
          },
          {
            apiName: "End_Date__c",
            label: "End Date",
            type: "Date",
            required: true
          },
          {
            apiName: "Budget__c",
            label: "Budget",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            apiName: "Actual_Cost__c",
            label: "Actual Cost",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            apiName: "Project_Manager__c",
            label: "Project Manager",
            type: "Lookup",
            referenceTo: "User",
            relationshipName: "Project_Manager",
            deleteConstraint: "SetNull"
          },
          {
            apiName: "Client_Name__c",
            label: "Client Name",
            type: "Text",
            length: 100
          },
          {
            apiName: "Progress_Percentage__c",
            label: "Progress Percentage",
            type: "Percent",
            precision: 5,
            scale: 2
          },
          {
            apiName: "Portfolio__c",
            label: "Portfolio",
            type: "MasterDetail",
            referenceTo: "Portfolio__c",
            relationshipLabel: "Projects",
            relationshipName: "Projects",
            relationshipOrder: 0,
            reparentableMasterDetail: false,
            writeRequiresMasterRead: false
          }
        ]
      },
      {
        apiName: "Sprint__c",
        label: "Sprint",
        pluralLabel: "Sprints",
        nameField: {
          displayFormat: "SPRINT-{0000}",
          label: "Sprint Number"
        },
        fields: [
          {
            apiName: "Sprint_Name__c",
            label: "Sprint Name",
            type: "Text",
            length: 255,
            required: true
          },
          {
            apiName: "Project__c",
            label: "Project",
            type: "Lookup",
            referenceTo: "Project__c",
            relationshipLabel: "Sprints",
            relationshipName: "Sprints",
            deleteConstraint: "SetNull",
            required: false
          },
          {
            apiName: "Start_Date__c",
            label: "Start Date",
            type: "Date",
            required: true
          },
          {
            apiName: "End_Date__c",
            label: "End Date",
            type: "Date",
            required: true
          },
          {
            apiName: "Goal__c",
            label: "Goal",
            type: "LongTextArea",
            length: 1000,
            visibleLines: 3
          },
          {
            apiName: "Status__c",
            label: "Status",
            type: "Picklist",
            valueSet: {
              values: ["Planning", "Active", "Completed"]
            }
          },
          {
            apiName: "Capacity__c",
            label: "Capacity",
            type: "Number",
            precision: 8,
            scale: 2,
            unique: false
          },
          {
            apiName: "Velocity__c",
            label: "Velocity",
            type: "Number",
            precision: 8,
            scale: 2,
            unique: false
          }
        ]
      },
      {
        apiName: "Task__c",
        label: "Task",
        pluralLabel: "Tasks",
        nameField: {
          displayFormat: "TASK-{0000}",
          label: "Task Number"
        },
        fields: [
          {
            apiName: "Task_Name__c",
            label: "Task Name",
            type: "Text",
            length: 255,
            required: true
          },
          {
            apiName: "Description__c",
            label: "Description",
            type: "LongTextArea",
            length: 32768,
            visibleLines: 3
          },
          {
            apiName: "Status__c",
            label: "Status",
            type: "Picklist",
            valueSet: {
              values: ["To Do", "In Progress", "In Review", "Done", "Blocked"]
            }
          },
          {
            apiName: "Priority__c",
            label: "Priority",
            type: "Picklist",
            valueSet: {
              values: ["Low", "Medium", "High", "Critical"]
            }
          },
          {
            apiName: "Type__c",
            label: "Type",
            type: "Picklist",
            valueSet: {
              values: ["User Story", "Bug", "Task", "Epic"]
            }
          },
          {
            apiName: "Assigned_To__c",
            label: "Assigned To",
            type: "Lookup",
            referenceTo: "User",
            relationshipName: "Tasks",
            deleteConstraint: "SetNull"
          },
          {
            apiName: "Story_Points__c",
            label: "Story Points",
            type: "Number",
            precision: 2,
            scale: 0,
            unique: false
          },
          {
            apiName: "Due_Date__c",
            label: "Due Date",
            type: "Date"
          },
          {
            apiName: "Start_Date__c",
            label: "Start Date",
            type: "Date"
          },
          {
            apiName: "Completion_Date__c",
            label: "Completion Date",
            type: "Date"
          },
          {
            apiName: "Time_Estimate__c",
            label: "Time Estimate",
            type: "Number",
            precision: 8,
            scale: 2,
            unique: false
          },
          {
            apiName: "Time_Logged__c",
            label: "Time Logged",
            type: "Number",
            precision: 8,
            scale: 2,
            unique: false
          },
          {
            apiName: "Project__c",
            label: "Project",
            type: "MasterDetail",
            referenceTo: "Project__c",
            relationshipLabel: "Tasks",
            relationshipName: "Tasks",
            relationshipOrder: 0,
            reparentableMasterDetail: false,
            writeRequiresMasterRead: false
          },
          {
            apiName: "Sprint__c",
            label: "Sprint",
            type: "Lookup",
            referenceTo: "Sprint__c",
            relationshipLabel: "Tasks",
            relationshipName: "Tasks",
            deleteConstraint: "SetNull"
          },
          {
            apiName: "Epic__c",
            label: "Epic",
            type: "Text",
            length: 100
          },
          {
            apiName: "Kanban_Column__c",
            label: "Kanban Column",
            type: "Text",
            length: 50,
            defaultValue: "'To Do'"
          },
          {
            apiName: "Dependencies__c",
            label: "Dependencies",
            type: "LongTextArea",
            length: 1000,
            visibleLines: 3
          }
        ]
      },
      {
        apiName: "Time_Entry__c",
        label: "Time Entry",
        pluralLabel: "Time Entries",
        nameField: {
          displayFormat: "TIME-{0000}",
          label: "Time Entry Number"
        },
        fields: [
          {
            apiName: "Task__c",
            label: "Task",
            type: "MasterDetail",
            referenceTo: "Task__c",
            relationshipLabel: "Time Entries",
            relationshipName: "Time_Entries",
            relationshipOrder: 0,
            reparentableMasterDetail: false,
            writeRequiresMasterRead: false
          },
          {
            apiName: "User__c",
            label: "User",
            type: "Lookup",
            referenceTo: "User",
            relationshipName: "Time_Entries",
            deleteConstraint: "SetNull",
            required: false
          },
          {
            apiName: "Hours__c",
            label: "Hours",
            type: "Number",
            precision: 8,
            scale: 2,
            unique: false,
            required: true
          },
          {
            apiName: "Date__c",
            label: "Date",
            type: "Date",
            defaultValue: "TODAY()",
            required: true
          },
          {
            apiName: "Description__c",
            label: "Description",
            type: "Text",
            length: 255
          },
          {
            apiName: "Billable__c",
            label: "Billable",
            type: "Checkbox",
            defaultValue: "true"
          },
          {
            apiName: "Hourly_Rate__c",
            label: "Hourly Rate",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            apiName: "Total_Cost__c",
            label: "Total Cost",
            type: "Currency",
            precision: 18,
            scale: 2,
            formula: "Hours__c * Hourly_Rate__c"
          }
        ]
      },
      {
        apiName: "Resource__c",
        label: "Resource",
        pluralLabel: "Resources",
        nameField: {
          displayFormat: "RES-{0000}",
          label: "Resource Number"
        },
        fields: [
          {
            apiName: "User__c",
            label: "User",
            type: "Lookup",
            referenceTo: "User",
            relationshipName: "Resources",
            deleteConstraint: "SetNull",
            required: false
          },
          {
            apiName: "Role__c",
            label: "Role",
            type: "Picklist",
            valueSet: {
              values: [
                "Developer",
                "Designer",
                "Project Manager",
                "QA Engineer",
                "Business Analyst",
                "Consultant"
              ]
            }
          },
          {
            apiName: "Skills__c",
            label: "Skills",
            type: "MultiselectPicklist",
            valueSet: {
              values: [
                "Apex",
                "Lightning",
                "Integration",
                "JavaScript",
                "UI/UX Design",
                "Project Management",
                "Testing",
                "Business Analysis"
              ],
              visibleLines: 4
            }
          },
          {
            apiName: "Hourly_Rate__c",
            label: "Hourly Rate",
            type: "Currency",
            precision: 18,
            scale: 2
          },
          {
            apiName: "Capacity__c",
            label: "Capacity",
            type: "Number",
            precision: 3,
            scale: 1,
            unique: false,
            defaultValue: "8.0"
          },
          {
            apiName: "Available_From__c",
            label: "Available From",
            type: "Date"
          },
          {
            apiName: "Available_To__c",
            label: "Available To",
            type: "Date"
          }
        ]
      },
      {
        apiName: "Document__c",
        label: "Document",
        pluralLabel: "Documents",
        nameField: {
          displayFormat: "DOC-{0000}",
          label: "Document Number"
        },
        fields: [
          {
            apiName: "Document_Name__c",
            label: "Document Name",
            type: "Text",
            length: 255,
            required: true
          },
          {
            apiName: "Content__c",
            label: "Content",
            type: "LongTextArea",
            length: 131072,
            visibleLines: 5
          },
          {
            apiName: "Type__c",
            label: "Type",
            type: "Picklist",
            valueSet: {
              values: [
                "Specification",
                "Design",
                "Testing",
                "Meeting Notes",
                "Wiki"
              ]
            }
          },
          {
            apiName: "Project__c",
            label: "Project",
            type: "Lookup",
            referenceTo: "Project__c",
            relationshipLabel: "Documents",
            relationshipName: "Documents",
            deleteConstraint: "SetNull"
          },
          {
            apiName: "Author__c",
            label: "Author",
            type: "Lookup",
            referenceTo: "User",
            relationshipName: "Documents",
            deleteConstraint: "SetNull"
          },
          {
            apiName: "Version__c",
            label: "Version",
            type: "Text",
            length: 10,
            defaultValue: "'1.0'"
          },
          {
            apiName: "Status__c",
            label: "Status",
            type: "Picklist",
            valueSet: {
              values: ["Draft", "Review", "Approved", "Archived"]
            }
          },
          {
            apiName: "Tags__c",
            label: "Tags",
            type: "Text",
            length: 255
          }
        ]
      }
    ];
  }
}

// Execute if run directly
if (require.main === module) {
  const generator = new SalesforceMetadataGenerator();
  generator.generate();
}

module.exports = SalesforceMetadataGenerator;
