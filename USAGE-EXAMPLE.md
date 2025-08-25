# Usage Examples

## Quick Start Example

```bash
# 1. Clone or download the generator
cd SFProjectHub

# 2. Generate all metadata files
node generate-metadata.js

# 3. Validate the metadata
npm run validate:objects

# 4. Deploy to your org
npm run deploy:objects
```

## Example Output

When you run the generator, you'll see:

```
🚀 Generating Salesforce Project Hub Metadata...

📁 Creating directory structure...
🔨 Generating Portfolio__c...
   ✓ Created 7 fields for Portfolio__c
🔨 Generating Project__c...
   ✓ Created 12 fields for Project__c
🔨 Generating Sprint__c...
   ✓ Created 8 fields for Sprint__c
🔨 Generating Task__c...
   ✓ Created 17 fields for Task__c
🔨 Generating Time_Entry__c...
   ✓ Created 8 fields for Time_Entry__c
🔨 Generating Resource__c...
   ✓ Created 7 fields for Resource__c
🔨 Generating Document__c...
   ✓ Created 8 fields for Document__c

✅ Metadata generation completed successfully!

📂 Generated files in: force-app/main/default/objects

🚀 Ready for deployment:
   sf project deploy start --source-dir force-app/main/default/objects
```

## Customization Example

To add a new field to the Task object:

```javascript
// In generate-metadata.js, find the Task__c object definition
// Add a new field to the fields array:

{
    apiName: 'Effort_Level__c',
    label: 'Effort Level',
    type: 'Picklist',
    valueSet: {
        values: ['Small', 'Medium', 'Large', 'X-Large']
    }
}
```

## Clean and Regenerate

```bash
# Clean existing metadata
npm run clean:metadata

# Generate fresh metadata
npm run generate:metadata
```

## Deployment Workflow

```bash
# 1. Generate metadata
npm run generate:metadata

# 2. Check what will be deployed
sf project deploy start --source-dir force-app/main/default/objects --dry-run

# 3. Deploy to sandbox first
sf project deploy start --source-dir force-app/main/default/objects --target-org MySandbox

# 4. Run tests (if any)
sf apex run test --target-org MySandbox

# 5. Deploy to production
sf project deploy start --source-dir force-app/main/default/objects --target-org MyProd
```

## Creating Sample Data

After deployment, you can create sample data:

```bash
# Create a Portfolio
sf data create record --sobject Portfolio__c --values "Portfolio_Name__c='Web Development Projects' Status__c='Active' Start_Date__c='2024-01-01' End_Date__c='2024-12-31' Owner__c='[USER_ID]'"

# Create a Project under the Portfolio
sf data create record --sobject Project__c --values "Project_Name__c='Customer Portal' Status__c='Active' Priority__c='High' Start_Date__c='2024-02-01' End_Date__c='2024-06-30' Portfolio__c='[PORTFOLIO_ID]'"
```

## Integration with CI/CD

```yaml
# Example GitHub Actions workflow
name: Deploy Project Hub Metadata

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Generate Metadata
        run: npm run generate:metadata

      - name: Validate Deployment
        run: npm run validate:objects
        env:
          SFDX_AUDIENCE_URL: ${{ secrets.SFDX_AUDIENCE_URL }}
          SFDX_CLIENT_ID: ${{ secrets.SFDX_CLIENT_ID }}
          SFDX_JWT_KEY: ${{ secrets.SFDX_JWT_KEY }}
          SFDX_USERNAME: ${{ secrets.SFDX_USERNAME }}
```
