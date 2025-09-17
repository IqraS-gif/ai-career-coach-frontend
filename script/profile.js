// frontend/script/profile.js

const API_BASE_URL = 'https://ai-career-coach-backend-3.onrender.com';
let currentUser = null;
let originalResumeData = {}; // To store the initial state for the "Cancel" button

// --- DOM Element References ---
const userNameSpan = document.getElementById('user-name');
const userEmailSpan = document.getElementById('user-email');

// Form Buttons
const editBtn = document.getElementById('editResumeDetailsButton');
const saveBtn = document.getElementById('saveResumeDetailsButton');
const cancelBtn = document.getElementById('cancelEditDetailsButton');
const addProjectBtn = document.getElementById('addProjectButton');

// Status Divs
const detailsUpdateStatusDiv = document.getElementById('details-update-status');
const fileUploadStatusDiv = document.getElementById('file-upload-status');

// Main Form & File Upload
const editDetailsForm = document.getElementById('edit-resume-details-form');
const uploadResumeFileForm = document.getElementById('upload-resume-file-form');
const resumeFileInput = document.getElementById('resumeFileInput');
const fileNameDisplay = document.getElementById('fileName');
const uploadResumeFileButton = document.getElementById('uploadResumeFileButton');

// Dynamic Content Containers
const skillsContainer = document.getElementById('skills-container');
const projectsContainer = document.getElementById('projects-list-container');
const skillsInput = document.getElementById('profileSkillsInput');

/**
 * Main entry point, called by auth.js after user logs in.
 */
function onUserLoggedIn(user) {
    currentUser = user;
    if (userNameSpan) userNameSpan.textContent = currentUser.displayName || 'Not set';
    if (userEmailSpan) userEmailSpan.textContent = currentUser.email;
    
    setupEventListeners();
    fetchAndDisplayResume();
}

/**
 * Sets up all static event listeners for the page.
 */
function setupEventListeners() {
    editBtn.addEventListener('click', () => toggleEditMode(true));
    cancelBtn.addEventListener('click', () => {
        populateResumeFields(originalResumeData); // Revert changes
        toggleEditMode(false);
    });
    
    editDetailsForm.addEventListener('submit', handleSaveDetails);
    uploadResumeFileForm.addEventListener('submit', handleResumeUpload);

    resumeFileInput.addEventListener('change', () => {
        fileNameDisplay.textContent = resumeFileInput.files[0] ? resumeFileInput.files[0].name : 'No file chosen';
    });

    document.querySelector('.tab-nav').addEventListener('click', (e) => {
        if (e.target.matches('.tab-link')) switchTab(e.target);
    });

    skillsInput.addEventListener('keydown', handleSkillAdd);
    addProjectBtn.addEventListener('click', () => addProjectEntry());
    
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
}

/**
 * Fetches the user's full profile and populates the form.
 */
async function fetchAndDisplayResume() {
    if (!currentUser) return;
    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to load resume.');

        originalResumeData = data.resume_content || {};
        populateResumeFields(originalResumeData);
    } catch (error) {
        showStatus(detailsUpdateStatusDiv, error.message, true);
    }
}

/**
 * Populates all form fields, including the dynamic ones.
 * @param {object} resumeContent The user's resume data.
 */
function populateResumeFields(resumeContent = {}) {
    // Personal Info
    const pInfo = resumeContent.personal_info || {};
    document.getElementById('profileName').value = pInfo.name || '';
    document.getElementById('profileEmail').value = pInfo.email || '';
    document.getElementById('profilePhone').value = pInfo.phone || '';
    document.getElementById('profileLinkedin').value = pInfo.linkedin || '';
    document.getElementById('profileGithub').value = pInfo.github || '';

    // Summary
    document.getElementById('profileSummary').value = resumeContent.summary || '';

    // Skills
    skillsContainer.innerHTML = '';
    const allSkills = resumeContent.skills ? Object.values(resumeContent.skills).flat() : [];
    allSkills.forEach(skill => createSkillTag(skill));

    // Projects
    projectsContainer.innerHTML = '';
    const projects = resumeContent.projects || [];
    if (projects.length > 0) {
        projects.forEach(proj => addProjectEntry(proj));
    } else {
        addProjectEntry(); // Add one empty entry if none exist
    }
}

/**
 * Switches the active tab in the resume details section.
 * @param {HTMLElement} clickedTab The tab button that was clicked.
 */
function switchTab(clickedTab) {
    const tabContainer = clickedTab.closest('.tab-container');
    tabContainer.querySelector('.tab-link.active')?.classList.remove('active');
    tabContainer.querySelector('.tab-pane.active')?.classList.remove('active');
    
    clickedTab.classList.add('active');
    document.getElementById(clickedTab.dataset.tab).classList.add('active');
}

/**
 * Toggles the entire form between viewing and editing states.
 * @param {boolean} isEditing True to enter edit mode, false to exit.
 */
function toggleEditMode(isEditing) {
    editBtn.classList.toggle('hidden', isEditing);
    saveBtn.classList.toggle('hidden', !isEditing);
    cancelBtn.classList.toggle('hidden', !isEditing);

    // Toggle main form inputs
    editDetailsForm.querySelectorAll('input, textarea').forEach(el => el.disabled = !isEditing);
    addProjectBtn.disabled = !isEditing;

    // Toggle remove buttons on dynamic elements
    document.querySelectorAll('.skill-tag button, .btn-remove-project').forEach(btn => btn.classList.toggle('hidden', !isEditing));
    
    // Disable file upload while editing details
    resumeFileInput.disabled = isEditing;
    uploadResumeFileButton.disabled = isEditing;
}

/**
 * Gathers all data from the form, including dynamic elements, and saves it.
 */
async function handleSaveDetails(e) {
    e.preventDefault();
    showStatus(detailsUpdateStatusDiv, 'Saving...', false);

    // Gather data from dynamic fields
    const skillsList = [...skillsContainer.querySelectorAll('.skill-tag')].map(tag => tag.firstChild.textContent);
    const projectsList = [...projectsContainer.querySelectorAll('.project-entry')].map(entry => ({
        title: entry.querySelector('.project-title').value.trim(),
        description: [entry.querySelector('.project-description').value.trim()]
    })).filter(p => p.title); // Only include projects with a title

    const updatedResumeData = {
        personal_info: {
            name: document.getElementById('profileName').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
            phone: document.getElementById('profilePhone').value.trim(),
            linkedin: document.getElementById('profileLinkedin').value.trim(),
            github: document.getElementById('profileGithub').value.trim(),
        },
        summary: document.getElementById('profileSummary').value.trim(),
        // AI will categorize skills, so we send them in a single bucket
        skills: { 'Core Skills': skillsList },
        projects: projectsList
    };

    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/user/profile/resume-details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ parsed_data: updatedResumeData })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Could not update details.');
        
        showStatus(detailsUpdateStatusDiv, 'Details updated successfully!', false);
        originalResumeData = JSON.parse(JSON.stringify(updatedResumeData)); // Update the original state
        toggleEditMode(false);
    } catch (error) {
        showStatus(detailsUpdateStatusDiv, error.message, true);
    }
}

/**
 * Handles the upload of a new resume file with confirmation.
 */
async function handleResumeUpload(e) {
    e.preventDefault();
    if (!resumeFileInput.files[0]) {
        showStatus(fileUploadStatusDiv, 'Please select a file.', true);
        return;
    }
    if (!confirm("Are you sure? Uploading a file will replace all your current resume data.")) {
        return;
    }
    
    showStatus(fileUploadStatusDiv, 'Uploading and processing...', false);
    const formData = new FormData();
    formData.append('file', resumeFileInput.files[0]);

    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` },
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Upload failed.');

        showStatus(fileUploadStatusDiv, 'Resume processed! Profile updated.', false);
        resumeFileInput.value = '';
        fileNameDisplay.textContent = 'No file chosen';
        await fetchAndDisplayResume(); // Refresh all data
    } catch (error) {
        showStatus(fileUploadStatusDiv, error.message, true);
    }
}

// --- Dynamic Element Creation ---

function handleSkillAdd(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const skillName = skillsInput.value.trim();
        if (skillName) {
            createSkillTag(skillName);
            skillsInput.value = '';
        }
    }
}

function createSkillTag(name) {
    const tag = document.createElement('div');
    tag.className = 'skill-tag';
    tag.textContent = name;
    
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = () => tag.remove();
    // Hide remove button if not in edit mode
    removeBtn.classList.toggle('hidden', editBtn.style.display !== 'none');
    
    tag.appendChild(removeBtn);
    skillsContainer.appendChild(tag);
}

function addProjectEntry(project = { title: '', description: '' }) {
    const entry = document.createElement('div');
    entry.className = 'project-entry';
    const descText = Array.isArray(project.description) ? project.description.join(' ') : project.description;

    entry.innerHTML = `
        <div class="form-group">
            <label>Project Title:</label>
            <input type="text" class="project-title" value="${project.title || ''}" placeholder="e.g., AI Career Coach" disabled>
        </div>
        <div class="form-group">
            <label>Project Description:</label>
            <textarea class="project-description" rows="3" placeholder="Describe the project..." disabled>${descText || ''}</textarea>
        </div>
        <button type="button" class="btn-remove-project hidden" onclick="this.parentElement.remove()"><i class="fas fa-trash-alt"></i></button>
    `;
    projectsContainer.appendChild(entry);
}

// --- Utility Functions ---

function showStatus(div, message, isError = false) {
    div.textContent = message;
    div.className = isError ? 'status-message error' : 'status-message success';
    div.classList.remove('hidden');
    setTimeout(() => div.classList.add('hidden'), 4000);
}

async function handleLogout() {
    try {
        await firebase.auth().signOut();
    } catch (error) {
        console.error("Error signing out:", error);
    }
}
