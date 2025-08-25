#!/bin/bash

echo "🚀 Deploying Realtime Kanban Board Components..."
echo "================================================="

# Check which CLI version is available
if command -v sf &> /dev/null; then
    echo "📦 Using Salesforce CLI v2 (sf)..."
    CLI_CMD="sf"
    DEPLOY_CMD="project deploy start"
    VALIDATE_CMD="project deploy validate"
elif command -v sfdx &> /dev/null; then
    echo "📦 Using Salesforce CLI v1 (sfdx)..."
    CLI_CMD="sfdx"
    DEPLOY_CMD="force:source:deploy"
    VALIDATE_CMD="force:source:deploy"
else
    echo "❌ Neither 'sf' nor 'sfdx' CLI found. Please install Salesforce CLI."
    exit 1
fi

# Deploy the Kanban components using the specific package
echo "📦 Validating deployment to default org..."

if [ "$CLI_CMD" = "sf" ]; then
    sf project deploy validate --manifest manifest/kanban-package.xml
else
    sfdx force:source:deploy -x manifest/kanban-package.xml --checkonly
fi

if [ $? -eq 0 ]; then
    echo "✅ Validation successful! Proceeding with actual deployment..."
    
    if [ "$CLI_CMD" = "sf" ]; then
        sf project deploy start --manifest manifest/kanban-package.xml
    else
        sfdx force:source:deploy -x manifest/kanban-package.xml
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 SUCCESS! Kanban Board components deployed successfully!"
        echo ""
        echo "📋 Components deployed:"
        echo "  ✅ RealtimeKanbanController (Apex)"
        echo "  ✅ RealtimeKanbanControllerTest (Apex Test)"
        echo "  ✅ Task_Update_Event__e (Platform Event)"
        echo "  ✅ realtimeKanban (Lightning Web Component)"
        echo ""
        echo "🔄 Next steps:"
        echo "1. Add the 'Realtime Kanban Board' component to your Lightning App page"
        echo "2. Component will automatically show project selection if no projectId is configured"
        echo "3. Create some Project__c records if none exist in your org"
        echo ""
    else
        echo "❌ Deployment failed. Check the errors above."
        exit 1
    fi
else
    echo "❌ Validation failed. Check the errors above."
    echo "💡 Common issues:"
    echo "  - Make sure you're in a Salesforce DX project directory"
    echo "  - Ensure you have a default org set: sfdx force:org:list"
    echo "  - Check that Task__c custom object exists in your org"
    exit 1
fi