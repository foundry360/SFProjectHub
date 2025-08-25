#!/bin/bash

echo "🚀 Deploying Realtime Kanban Board Components..."
echo "================================================="

# Deploy the Kanban components using the specific package
echo "📦 Deploying components to default org..."
sfdx force:source:deploy -x manifest/kanban-package.xml --checkonly

if [ $? -eq 0 ]; then
    echo "✅ Validation successful! Proceeding with actual deployment..."
    sfdx force:source:deploy -x manifest/kanban-package.xml
    
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