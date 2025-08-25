public with sharing class RealtimeKanbanController {
    
    @AuraEnabled(cacheable=true)
    public static List<TaskWrapper> getTasks(Id projectId) {
        try {
            List<Task__c> tasks = [
                SELECT Id, Name, Task_Name__c, Description__c, Status__c, Kanban_Column__c,
                       Priority__c, Story_Points__c, Due_Date__c, Assigned_To__c, 
                       Assigned_To__r.Name, Assigned_To__r.SmallPhotoUrl, Project__c,
                       CreatedDate, LastModifiedDate
                FROM Task__c 
                WHERE Project__c = :projectId 
                ORDER BY CreatedDate ASC
            ];
            
            List<TaskWrapper> taskWrappers = new List<TaskWrapper>();
            for (Task__c task : tasks) {
                TaskWrapper wrapper = new TaskWrapper();
                wrapper.task = task;
                wrapper.isOverdue = task.Due_Date__c != null && task.Due_Date__c < Date.today() && task.Status__c != 'Done';
                wrapper.assignedUserName = task.Assigned_To__r?.Name;
                wrapper.assignedUserPhoto = task.Assigned_To__r?.SmallPhotoUrl;
                taskWrappers.add(wrapper);
            }
            
            return taskWrappers;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving tasks: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateTaskColumn(Id taskId, String newColumn) {
        try {
            Task__c task = new Task__c(Id = taskId, Kanban_Column__c = newColumn);
            
            if (newColumn == 'Done') {
                task.Status__c = 'Done';
                task.Completion_Date__c = Date.today();
            } else {
                task.Status__c = newColumn;
            }
            
            update task;
            
            publishTaskUpdateEvent(taskId, newColumn);
            
        } catch (Exception e) {
            throw new AuraHandledException('Error updating task: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static Id createTask(String taskName, String description, String priority, 
                               Decimal storyPoints, Date dueDate, Id assignedTo, Id projectId) {
        try {
            Task__c newTask = new Task__c(
                Task_Name__c = taskName,
                Description__c = description,
                Priority__c = priority,
                Story_Points__c = storyPoints,
                Due_Date__c = dueDate,
                Assigned_To__c = assignedTo,
                Project__c = projectId,
                Status__c = 'To Do',
                Kanban_Column__c = 'To Do'
            );
            
            insert newTask;
            
            publishTaskUpdateEvent(newTask.Id, 'To Do');
            
            return newTask.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating task: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateTask(Id taskId, String taskName, String description, 
                                 String priority, Decimal storyPoints, Date dueDate, Id assignedTo) {
        try {
            Task__c task = new Task__c(
                Id = taskId,
                Task_Name__c = taskName,
                Description__c = description,
                Priority__c = priority,
                Story_Points__c = storyPoints,
                Due_Date__c = dueDate,
                Assigned_To__c = assignedTo
            );
            
            update task;
            
            publishTaskUpdateEvent(taskId, null);
            
        } catch (Exception e) {
            throw new AuraHandledException('Error updating task: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<UserOption> getUsers() {
        try {
            List<User> users = [
                SELECT Id, Name, SmallPhotoUrl 
                FROM User 
                WHERE IsActive = true 
                ORDER BY Name ASC 
                LIMIT 200
            ];
            
            List<UserOption> userOptions = new List<UserOption>();
            for (User user : users) {
                UserOption option = new UserOption();
                option.value = user.Id;
                option.label = user.Name;
                option.photoUrl = user.SmallPhotoUrl;
                userOptions.add(option);
            }
            
            return userOptions;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving users: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<ProjectOption> getProjects() {
        try {
            // First, get all projects to see what exists
            List<Project__c> allProjects = [
                SELECT Id, Name, Project_Name__c, Status__c, Description__c
                FROM Project__c 
                ORDER BY Project_Name__c ASC, Name ASC 
                LIMIT 100
            ];
            
            // Filter for active projects, but include projects with null status
            List<Project__c> projects = new List<Project__c>();
            for (Project__c project : allProjects) {
                // Include projects that are likely active or have no status set
                if (project.Status__c == null || 
                    project.Status__c == 'Planning' || 
                    project.Status__c == 'In Progress' || 
                    project.Status__c == 'Active' ||
                    project.Status__c == 'On Hold') {
                    projects.add(project);
                }
            }
            
            // If no active projects found, return all projects
            if (projects.isEmpty() && !allProjects.isEmpty()) {
                projects = allProjects;
            }
            
            List<ProjectOption> projectOptions = new List<ProjectOption>();
            for (Project__c project : projects) {
                ProjectOption option = new ProjectOption();
                option.value = project.Id;
                option.label = project.Project_Name__c != null ? project.Project_Name__c : project.Name;
                option.status = project.Status__c;
                option.description = project.Description__c;
                projectOptions.add(option);
            }
            
            return projectOptions;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving projects: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static String getProjectDebugInfo() {
        try {
            Integer totalCount = [SELECT COUNT() FROM Project__c];
            
            List<AggregateResult> statusCounts = [
                SELECT Status__c, COUNT(Id) recordCount 
                FROM Project__c 
                GROUP BY Status__c
                ORDER BY COUNT(Id) DESC
            ];
            
            String result = 'Total Projects: ' + totalCount + '\n';
            result += 'Status Breakdown:\n';
            
            for (AggregateResult ar : statusCounts) {
                String status = (String)ar.get('Status__c');
                Integer count = (Integer)ar.get('recordCount');
                result += '- ' + (status != null ? status : 'NULL') + ': ' + count + '\n';
            }
            
            return result;
        } catch (Exception e) {
            return 'Error getting debug info: ' + e.getMessage();
        }
    }
    
    private static void publishTaskUpdateEvent(Id taskId, String column) {
        try {
            Task_Update_Event__e event = new Task_Update_Event__e(
                Task_Id__c = taskId,
                Action_Type__c = column != null ? 'COLUMN_CHANGE' : 'TASK_UPDATE',
                New_Column__c = column,
                Updated_By__c = UserInfo.getUserId(),
                Timestamp__c = Datetime.now()
            );
            
            EventBus.publish(event);
        } catch (Exception e) {
            System.debug('Error publishing platform event: ' + e.getMessage());
        }
    }
    
    public class TaskWrapper {
        @AuraEnabled public Task__c task { get; set; }
        @AuraEnabled public Boolean isOverdue { get; set; }
        @AuraEnabled public String assignedUserName { get; set; }
        @AuraEnabled public String assignedUserPhoto { get; set; }
    }
    
    public class UserOption {
        @AuraEnabled public Id value { get; set; }
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public String photoUrl { get; set; }
    }
    
    public class ProjectOption {
        @AuraEnabled public Id value { get; set; }
        @AuraEnabled public String label { get; set; }
        @AuraEnabled public String status { get; set; }
        @AuraEnabled public String description { get; set; }
    }
}