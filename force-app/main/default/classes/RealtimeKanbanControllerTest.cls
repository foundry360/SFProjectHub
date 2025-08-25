@isTest
private class RealtimeKanbanControllerTest {
    
    @TestSetup
    static void setupTestData() {
        // Create test project
        Project__c testProject = new Project__c(
            Project_Name__c = 'Test Project',
            Status__c = 'In Progress',
            Description__c = 'Test project for Kanban board'
        );
        insert testProject;
        
        // Create test user
        User testUser = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];
        
        // Create test tasks
        List<Task__c> testTasks = new List<Task__c>();
        
        testTasks.add(new Task__c(
            Task_Name__c = 'Test Task 1',
            Description__c = 'Test Description 1',
            Status__c = 'To Do',
            Kanban_Column__c = 'To Do',
            Priority__c = 'High',
            Story_Points__c = 3,
            Due_Date__c = Date.today().addDays(7),
            Assigned_To__c = testUser.Id,
            Project__c = testProject.Id
        ));
        
        testTasks.add(new Task__c(
            Task_Name__c = 'Test Task 2',
            Description__c = 'Test Description 2',
            Status__c = 'In Progress',
            Kanban_Column__c = 'In Progress',
            Priority__c = 'Medium',
            Story_Points__c = 5,
            Due_Date__c = Date.today().addDays(3),
            Assigned_To__c = testUser.Id,
            Project__c = testProject.Id
        ));
        
        testTasks.add(new Task__c(
            Task_Name__c = 'Test Task 3',
            Description__c = 'Test Description 3',
            Status__c = 'Done',
            Kanban_Column__c = 'Done',
            Priority__c = 'Low',
            Story_Points__c = 2,
            Due_Date__c = Date.today().addDays(-1),
            Assigned_To__c = testUser.Id,
            Project__c = testProject.Id,
            Completion_Date__c = Date.today()
        ));
        
        insert testTasks;
    }
    
    @isTest
    static void testGetTasks() {
        Project__c testProject = [SELECT Id FROM Project__c LIMIT 1];
        
        Test.startTest();
        List<RealtimeKanbanController.TaskWrapper> result = RealtimeKanbanController.getTasks(testProject.Id);
        Test.stopTest();
        
        System.assertEquals(3, result.size(), 'Should return 3 tasks');
        
        // Verify task wrapper properties
        for (RealtimeKanbanController.TaskWrapper wrapper : result) {
            System.assertNotEquals(null, wrapper.task, 'Task should not be null');
            System.assertNotEquals(null, wrapper.assignedUserName, 'Assigned user name should not be null');
        }
        
        // Verify overdue calculation
        RealtimeKanbanController.TaskWrapper overdueTask = null;
        for (RealtimeKanbanController.TaskWrapper wrapper : result) {
            if (wrapper.task.Task_Name__c == 'Test Task 3') {
                overdueTask = wrapper;
                break;
            }
        }
        System.assertEquals(false, overdueTask.isOverdue, 'Completed task should not be marked as overdue');
    }
    
    @isTest
    static void testUpdateTaskColumn() {
        Task__c testTask = [SELECT Id, Kanban_Column__c, Status__c FROM Task__c WHERE Task_Name__c = 'Test Task 1' LIMIT 1];
        
        Test.startTest();
        RealtimeKanbanController.updateTaskColumn(testTask.Id, 'In Progress');
        Test.stopTest();
        
        Task__c updatedTask = [SELECT Id, Kanban_Column__c, Status__c FROM Task__c WHERE Id = :testTask.Id];
        System.assertEquals('In Progress', updatedTask.Kanban_Column__c, 'Kanban column should be updated');
        System.assertEquals('In Progress', updatedTask.Status__c, 'Status should be updated');
    }
    
    @isTest
    static void testUpdateTaskColumnToDone() {
        Task__c testTask = [SELECT Id, Kanban_Column__c, Status__c, Completion_Date__c FROM Task__c WHERE Task_Name__c = 'Test Task 2' LIMIT 1];
        
        Test.startTest();
        RealtimeKanbanController.updateTaskColumn(testTask.Id, 'Done');
        Test.stopTest();
        
        Task__c updatedTask = [SELECT Id, Kanban_Column__c, Status__c, Completion_Date__c FROM Task__c WHERE Id = :testTask.Id];
        System.assertEquals('Done', updatedTask.Kanban_Column__c, 'Kanban column should be updated to Done');
        System.assertEquals('Done', updatedTask.Status__c, 'Status should be updated to Done');
        System.assertEquals(Date.today(), updatedTask.Completion_Date__c, 'Completion date should be set');
    }
    
    @isTest
    static void testCreateTask() {
        Project__c testProject = [SELECT Id FROM Project__c LIMIT 1];
        User testUser = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];
        
        Test.startTest();
        Id newTaskId = RealtimeKanbanController.createTask(
            'New Test Task',
            'New test description',
            'Critical',
            8,
            Date.today().addDays(14),
            testUser.Id,
            testProject.Id
        );
        Test.stopTest();
        
        System.assertNotEquals(null, newTaskId, 'New task ID should not be null');
        
        Task__c newTask = [SELECT Id, Task_Name__c, Description__c, Priority__c, Story_Points__c, 
                          Due_Date__c, Assigned_To__c, Project__c, Status__c, Kanban_Column__c 
                          FROM Task__c WHERE Id = :newTaskId];
        
        System.assertEquals('New Test Task', newTask.Task_Name__c, 'Task name should match');
        System.assertEquals('New test description', newTask.Description__c, 'Description should match');
        System.assertEquals('Critical', newTask.Priority__c, 'Priority should match');
        System.assertEquals(8, newTask.Story_Points__c, 'Story points should match');
        System.assertEquals(Date.today().addDays(14), newTask.Due_Date__c, 'Due date should match');
        System.assertEquals(testUser.Id, newTask.Assigned_To__c, 'Assigned user should match');
        System.assertEquals(testProject.Id, newTask.Project__c, 'Project should match');
        System.assertEquals('To Do', newTask.Status__c, 'Status should be To Do by default');
        System.assertEquals('To Do', newTask.Kanban_Column__c, 'Kanban column should be To Do by default');
    }
    
    @isTest
    static void testUpdateTask() {
        Task__c testTask = [SELECT Id FROM Task__c WHERE Task_Name__c = 'Test Task 1' LIMIT 1];
        User testUser = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];
        
        Test.startTest();
        RealtimeKanbanController.updateTask(
            testTask.Id,
            'Updated Task Name',
            'Updated description',
            'Low',
            1,
            Date.today().addDays(30),
            testUser.Id
        );
        Test.stopTest();
        
        Task__c updatedTask = [SELECT Id, Task_Name__c, Description__c, Priority__c, Story_Points__c, 
                              Due_Date__c, Assigned_To__c FROM Task__c WHERE Id = :testTask.Id];
        
        System.assertEquals('Updated Task Name', updatedTask.Task_Name__c, 'Task name should be updated');
        System.assertEquals('Updated description', updatedTask.Description__c, 'Description should be updated');
        System.assertEquals('Low', updatedTask.Priority__c, 'Priority should be updated');
        System.assertEquals(1, updatedTask.Story_Points__c, 'Story points should be updated');
        System.assertEquals(Date.today().addDays(30), updatedTask.Due_Date__c, 'Due date should be updated');
    }
    
    @isTest
    static void testGetUsers() {
        Test.startTest();
        List<RealtimeKanbanController.UserOption> users = RealtimeKanbanController.getUsers();
        Test.stopTest();
        
        System.assert(users.size() > 0, 'Should return at least one user');
        
        for (RealtimeKanbanController.UserOption user : users) {
            System.assertNotEquals(null, user.value, 'User value should not be null');
            System.assertNotEquals(null, user.label, 'User label should not be null');
        }
    }
    
    @isTest
    static void testGetProjects() {
        Test.startTest();
        List<RealtimeKanbanController.ProjectOption> projects = RealtimeKanbanController.getProjects();
        Test.stopTest();
        
        System.assertEquals(1, projects.size(), 'Should return 1 project');
        
        RealtimeKanbanController.ProjectOption project = projects[0];
        System.assertNotEquals(null, project.value, 'Project value should not be null');
        System.assertNotEquals(null, project.label, 'Project label should not be null');
        System.assertEquals('In Progress', project.status, 'Project status should match');
    }
    
    @isTest
    static void testErrorHandling() {
        Test.startTest();
        try {
            RealtimeKanbanController.updateTaskColumn('invalid_id', 'To Do');
            System.assert(false, 'Should throw an exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Error updating task'), 'Should contain error message');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testTaskWrapperClass() {
        RealtimeKanbanController.TaskWrapper wrapper = new RealtimeKanbanController.TaskWrapper();
        wrapper.isOverdue = true;
        wrapper.assignedUserName = 'Test User';
        wrapper.assignedUserPhoto = 'test_photo_url';
        
        System.assertEquals(true, wrapper.isOverdue, 'isOverdue should be set correctly');
        System.assertEquals('Test User', wrapper.assignedUserName, 'assignedUserName should be set correctly');
        System.assertEquals('test_photo_url', wrapper.assignedUserPhoto, 'assignedUserPhoto should be set correctly');
    }
    
    @isTest
    static void testUserOptionClass() {
        RealtimeKanbanController.UserOption option = new RealtimeKanbanController.UserOption();
        option.value = 'test_id';
        option.label = 'Test Label';
        option.photoUrl = 'test_photo';
        
        System.assertEquals('test_id', option.value, 'value should be set correctly');
        System.assertEquals('Test Label', option.label, 'label should be set correctly');
        System.assertEquals('test_photo', option.photoUrl, 'photoUrl should be set correctly');
    }
    
    @isTest
    static void testProjectOptionClass() {
        RealtimeKanbanController.ProjectOption option = new RealtimeKanbanController.ProjectOption();
        option.value = 'test_project_id';
        option.label = 'Test Project';
        option.status = 'In Progress';
        option.description = 'Test Description';
        
        System.assertEquals('test_project_id', option.value, 'value should be set correctly');
        System.assertEquals('Test Project', option.label, 'label should be set correctly');
        System.assertEquals('In Progress', option.status, 'status should be set correctly');
        System.assertEquals('Test Description', option.description, 'description should be set correctly');
    }
}