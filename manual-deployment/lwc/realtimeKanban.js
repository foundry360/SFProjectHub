import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import getTasks from '@salesforce/apex/RealtimeKanbanController.getTasks';
import updateTaskColumn from '@salesforce/apex/RealtimeKanbanController.updateTaskColumn';
import getProjects from '@salesforce/apex/RealtimeKanbanController.getProjects';
import getProjectDebugInfo from '@salesforce/apex/RealtimeKanbanController.getProjectDebugInfo';

const COLUMNS = [
    { name: 'To Do', label: 'To Do', icon: 'utility:record_create', taskCount: 0, tasks: [], showAddButton: true },
    { name: 'In Progress', label: 'In Progress', icon: 'utility:clock', taskCount: 0, tasks: [], showAddButton: false },
    { name: 'In Review', label: 'In Review', icon: 'utility:preview', taskCount: 0, tasks: [], showAddButton: false },
    { name: 'Done', label: 'Done', icon: 'utility:success', taskCount: 0, tasks: [], showAddButton: false },
    { name: 'Blocked', label: 'Blocked', icon: 'utility:error', taskCount: 0, tasks: [], showAddButton: false }
];

export default class RealtimeKanban extends LightningElement {
    @api projectId;
    @api recordId; // For record pages
    
    @track columns = [...COLUMNS];
    @track isLoading = true;
    @track error;
    @track showTaskModal = false;
    @track showUpdateToast = false;
    @track showProjectSelector = false;
    @track availableProjects = [];
    @track editingTaskId;
    @track defaultColumn = 'To Do';
    @track selectedProjectId;
    @track debugInfo = '';

    // Drag and drop state
    draggedTaskId;
    draggedFromColumn;
    
    // Real-time updates
    subscription = {};
    platformEventChannel = '/event/Task_Update_Event__e';
    
    // Task editing state
    taskBeingEdited = new Set();
    
    // Cached data
    wiredTasksResult;
    allTaskWrappers = [];

    get effectiveProjectId() {
        return this.selectedProjectId || this.projectId || this.recordId;
    }
    
    get shouldShowProjectSelector() {
        return !this.effectiveProjectId && this.showProjectSelector;
    }
    
    get shouldShowKanban() {
        return this.effectiveProjectId && !this.shouldShowProjectSelector;
    }

    get modalTitle() {
        return this.editingTaskId ? 'Edit Task' : 'New Task';
    }

    get saveButtonLabel() {
        return this.editingTaskId ? 'Update' : 'Create';
    }

    // Wire methods
    @wire(getTasks, { projectId: '$effectiveProjectId' })
    wiredTasks(result) {
        this.wiredTasksResult = result;
        if (result.data) {
            this.processTaskData(result.data);
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error.body?.message || 'Unknown error occurred';
            this.columns = [...COLUMNS];
        }
        this.isLoading = false;
    }

    connectedCallback() {
        console.log('Kanban component connected');
        console.log('effectiveProjectId:', this.effectiveProjectId);
        console.log('projectId:', this.projectId);
        console.log('recordId:', this.recordId);
        
        this.subscribeToEvents();
        this.registerErrorListener();
        
        // If no projectId is provided, show project selector
        if (!this.effectiveProjectId) {
            console.log('No effectiveProjectId, loading projects...');
            this.loadProjects();
        } else {
            console.log('effectiveProjectId found, component should show Kanban');
        }
    }

    disconnectedCallback() {
        this.unsubscribeFromEvents();
    }

    // Data processing
    processTaskData(taskWrappers) {
        this.allTaskWrappers = taskWrappers;
        this.columns = COLUMNS.map(col => ({
            ...col,
            tasks: [],
            taskCount: 0
        }));

        // Organize tasks by column
        taskWrappers.forEach(wrapper => {
            const enrichedWrapper = this.enrichTaskWrapper(wrapper);
            const columnName = wrapper.task.Kanban_Column__c || 'To Do';
            const column = this.columns.find(col => col.name === columnName);
            
            if (column) {
                column.tasks.push(enrichedWrapper);
                column.taskCount = column.tasks.length;
            }
        });

        // Sort tasks within each column by creation date
        this.columns.forEach(column => {
            column.tasks.sort((a, b) => new Date(a.task.CreatedDate) - new Date(b.task.CreatedDate));
        });
    }

    enrichTaskWrapper(wrapper) {
        const today = new Date();
        const dueDate = wrapper.task.Due_Date__c ? new Date(wrapper.task.Due_Date__c) : null;
        
        return {
            ...wrapper,
            priorityClass: this.getPriorityClass(wrapper.task.Priority__c),
            dueDateClass: this.getDueDateClass(dueDate, today, wrapper.task.Status__c),
            formattedDueDate: this.formatDate(dueDate),
            isBeingEdited: this.taskBeingEdited.has(wrapper.task.Id)
        };
    }

    getPriorityClass(priority) {
        const baseClass = 'priority-indicator';
        switch (priority) {
            case 'Low':
                return `${baseClass} priority-low`;
            case 'Medium':
                return `${baseClass} priority-medium`;
            case 'High':
                return `${baseClass} priority-high`;
            case 'Critical':
                return `${baseClass} priority-critical`;
            default:
                return baseClass;
        }
    }

    getDueDateClass(dueDate, today, status) {
        const baseClass = 'due-date slds-badge';
        if (!dueDate || status === 'Done') {
            return `${baseClass} slds-badge_lightest`;
        }
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return `${baseClass} due-overdue`;
        } else if (diffDays <= 1) {
            return `${baseClass} due-today`;
        } else if (diffDays <= 3) {
            return `${baseClass} due-soon`;
        }
        return `${baseClass} slds-badge_lightest`;
    }

    formatDate(date) {
        if (!date) return '';
        
        const options = { 
            month: 'short', 
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat('en-US', options).format(date);
    }

    // Real-time event handling
    subscribeToEvents() {
        const messageCallback = (response) => {
            this.handlePlatformEvent(response);
        };

        subscribe(this.platformEventChannel, -1, messageCallback)
            .then(response => {
                this.subscription = response;
                console.log('Successfully subscribed to platform event');
            })
            .catch(error => {
                console.error('Failed to subscribe to platform event', error);
            });
    }

    unsubscribeFromEvents() {
        if (this.subscription) {
            unsubscribe(this.subscription, () => {
                console.log('Unsubscribed from platform event');
            });
        }
    }

    registerErrorListener() {
        onError(error => {
            console.error('Platform event error:', error);
        });
    }

    handlePlatformEvent(response) {
        const eventData = response.data.payload;
        
        // Ignore events triggered by current user
        if (eventData.Updated_By__c === this.getCurrentUserId()) {
            return;
        }

        // Handle different event types
        switch (eventData.Action_Type__c) {
            case 'COLUMN_CHANGE':
                this.handleRemoteColumnChange();
                break;
            case 'TASK_UPDATE':
                this.handleRemoteTaskUpdate(eventData);
                break;
            default:
                this.refreshData();
        }
    }

    handleRemoteColumnChange() {
        this.showUpdateToast = true;
        this.refreshData();
        
        // Auto-hide toast after 3 seconds
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.showUpdateToast = false;
        }, 3000);
    }

    handleRemoteTaskUpdate(eventData) {
        // Mark task as being edited by another user
        this.taskBeingEdited.add(eventData.Task_Id__c);
        this.processTaskData(this.allTaskWrappers);
        
        // Remove indicator after 2 seconds
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.taskBeingEdited.delete(eventData.Task_Id__c);
            this.processTaskData(this.allTaskWrappers);
        }, 2000);
        
        this.refreshData();
    }

    getCurrentUserId() {
        // This would typically be retrieved from user info
        // For now, return empty string to show all events
        return '';
    }

    // Drag and drop handlers
    handleDragStart(event) {
        this.draggedTaskId = event.target.dataset.taskId;
        this.draggedFromColumn = event.target.closest('.column-body').dataset.column;
        
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.draggedTaskId);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const columnBody = event.target.closest('.column-body');
        if (columnBody) {
            columnBody.classList.add('drag-over');
        }
    }

    handleDrop(event) {
        event.preventDefault();
        
        const columnBody = event.target.closest('.column-body');
        if (!columnBody) return;
        
        columnBody.classList.remove('drag-over');
        
        const targetColumn = columnBody.dataset.column;
        const draggedTask = this.template.querySelector(`[data-task-id="${this.draggedTaskId}"]`);
        
        if (draggedTask) {
            draggedTask.classList.remove('dragging');
        }

        if (targetColumn && this.draggedTaskId && targetColumn !== this.draggedFromColumn) {
            this.moveTask(this.draggedTaskId, targetColumn);
        }

        this.clearDragState();
    }

    clearDragState() {
        this.draggedTaskId = null;
        this.draggedFromColumn = null;
        
        // Remove all drag-related classes
        this.template.querySelectorAll('.dragging').forEach(element => {
            element.classList.remove('dragging');
        });
        
        this.template.querySelectorAll('.drag-over').forEach(element => {
            element.classList.remove('drag-over');
        });
    }

    async moveTask(taskId, newColumn) {
        try {
            this.isLoading = true;
            await updateTaskColumn({ taskId: taskId, newColumn: newColumn });
            await this.refreshData();
            
            this.showToast('Success', 'Task moved successfully', 'success');
        } catch (error) {
            this.showToast('Error', 'Failed to move task: ' + error.body.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Task management handlers
    handleNewTask() {
        this.defaultColumn = 'To Do';
        this.editingTaskId = null;
        this.showTaskModal = true;
    }

    handleNewTaskInColumn(event) {
        this.defaultColumn = event.target.closest('[data-column]').dataset.column;
        this.editingTaskId = null;
        this.showTaskModal = true;
    }

    handleTaskClick(event) {
        // Prevent click when dragging
        if (this.draggedTaskId) return;
        
        const taskId = event.currentTarget.dataset.taskId;
        this.editTask(taskId);
    }

    handleEditTask(event) {
        const taskId = event.target.closest('[data-task-id]').dataset.taskId;
        this.editTask(taskId);
    }

    editTask(taskId) {
        this.editingTaskId = taskId;
        this.showTaskModal = true;
    }

    handleDeleteTask() {
        // TODO: Implement delete functionality
        this.showToast('Info', 'Delete functionality to be implemented', 'info');
    }

    handleCloseModal() {
        this.showTaskModal = false;
        this.editingTaskId = null;
        this.defaultColumn = 'To Do';
    }

    handleTaskSave() {
        this.showTaskModal = false;
        this.refreshData();
        
        const message = this.editingTaskId ? 'Task updated successfully' : 'Task created successfully';
        this.showToast('Success', message, 'success');
        
        this.editingTaskId = null;
    }

    handleTaskError(event) {
        const errorMessage = event.detail.detail || 'An error occurred while saving the task';
        this.showToast('Error', errorMessage, 'error');
    }

    // Utility handlers
    handleRefresh() {
        this.isLoading = true;
        this.refreshData();
    }

    async refreshData() {
        try {
            await refreshApex(this.wiredTasksResult);
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showToast('Error', 'Failed to refresh data', 'error');
        }
    }

    handleCloseToast() {
        this.showUpdateToast = false;
    }
    
    // Project selection methods
    async loadProjects() {
        try {
            console.log('Loading projects...');
            this.isLoading = true;
            const projects = await getProjects();
            console.log('Projects loaded:', projects);
            this.availableProjects = projects.map(project => ({
                ...project,
                statusClass: this.getProjectStatusClass(project.status)
            }));
            this.showProjectSelector = true;
            this.error = undefined;
            console.log('Project selector should now show');
        } catch (error) {
            console.error('Error loading projects:', error);
            this.error = 'Error loading projects: ' + (error.body?.message || error.message || 'Unknown error');
            this.availableProjects = [];
            this.showProjectSelector = true; // Show selector even on error so user can retry
        } finally {
            this.isLoading = false;
            console.log('loadProjects completed. showProjectSelector:', this.showProjectSelector);
        }
    }
    
    getProjectStatusClass(status) {
        const baseClass = 'slds-badge';
        switch (status) {
            case 'Planning':
                return `${baseClass} slds-badge_lightest`;
            case 'In Progress':
                return `${baseClass}`;
            case 'On Hold':
                return `${baseClass} slds-badge_inverse`;
            default:
                return `${baseClass} slds-badge_lightest`;
        }
    }
    
    handleProjectSelect(event) {
        this.selectedProjectId = event.currentTarget.dataset.value;
        this.showProjectSelector = false;
        this.isLoading = true;
        
        // Refresh the component to load tasks for selected project
        this.refreshData();
    }
    
    handleChangeProject() {
        this.selectedProjectId = null;
        this.columns = [...COLUMNS];
        this.loadProjects();
    }

    handleRetryProjects() {
        this.loadProjects();
    }

    handleForceLoadProjects() {
        this.showProjectSelector = false;
        this.selectedProjectId = null;
        this.error = null;
        this.loadProjects();
    }

    async handleShowDebugInfo() {
        try {
            this.debugInfo = await getProjectDebugInfo();
        } catch (error) {
            this.debugInfo = 'Error getting debug info: ' + error.message;
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }

    // Accessibility and keyboard navigation
    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            if (event.target.classList.contains('task-card')) {
                event.preventDefault();
                this.handleTaskClick(event);
            }
        }
    }

    // Performance optimization - debounced search
    debounceTimeout;
    
    handleSearch(event) {
        clearTimeout(this.debounceTimeout);
        const searchTerm = event.target.value.toLowerCase();
        
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.debounceTimeout = setTimeout(() => {
            this.filterTasks(searchTerm);
        }, 300);
    }

    filterTasks(searchTerm) {
        if (!searchTerm) {
            this.processTaskData(this.allTaskWrappers);
            return;
        }

        const filteredWrappers = this.allTaskWrappers.filter(wrapper => 
            wrapper.task.Task_Name__c?.toLowerCase().includes(searchTerm) ||
            wrapper.task.Description__c?.toLowerCase().includes(searchTerm) ||
            wrapper.assignedUserName?.toLowerCase().includes(searchTerm)
        );

        this.processTaskData(filteredWrappers);
    }
}