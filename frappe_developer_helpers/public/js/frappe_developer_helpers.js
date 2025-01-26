frappe.provide("frappe.router");

function createCustomUI() {
    const container = document.getElementById('custom-ui-container') || document.createElement('div');
    container.id = 'custom-ui-container';
    container.innerHTML = ''; // Clear previous elements

    // Create Circle Button
    const circleDiv = document.createElement('div');
    circleDiv.id = 'custom-circle';
    circleDiv.textContent = 'API';

    // Create Pencil Button
    const pencilDiv = document.createElement('div');
    pencilDiv.id = 'custom-pencil';
    pencilDiv.innerHTML = '<i class="fas fa-pencil-alt"></i>';

    // Append to container
    container.appendChild(circleDiv);
    container.appendChild(pencilDiv);
    if (!document.body.contains(container)) {
        document.body.appendChild(container);
    }

    return { circleDiv, pencilDiv };
}

function addEventListeners(circleDiv, pencilDiv, pageType, page) {
    circleDiv.addEventListener('click', () => handleCircleClick(pageType, page));
    pencilDiv.addEventListener('click', () => handlePencilClick(page));
}

async function handlePencilClick(page) {
    try {
        showLoading(true);

        // Fetch DocType metadata
        const doc = await frappe.get_doc("DocType", page[1]);
        const filteredFields = filterFields(doc.fields);

        // Add "Limit" field
        filteredFields.push({
            label: 'Limit',
            fieldname: 'limit_frappe_developer_utils',
            fieldtype: 'Data',
            placeholder: '*'
        });

        // Create Dialog
        const dialog = new frappe.ui.Dialog({
            title: 'Select Fields',
            fields: filteredFields,
            size: 'extra-large',
            primary_action_label: 'Save Selection',
            primary_action(values) {
                localStorage.setItem(`${page[1]}_fields`, JSON.stringify(values));
                dialog.hide();
            }
        });

        // Load previously selected values if any
        const selectedFields = JSON.parse(localStorage.getItem(`${page[1]}_fields`) || '{}');
        dialog.set_values(selectedFields);

        dialog.show();
    } catch (error) {
        console.error("Error fetching DocType or showing dialog:", error);
        frappe.msgprint({
            title: 'Error',
            message: 'Could not load fields for customization.',
            indicator: 'red',
        });
    } finally {
        showLoading(false);
    }
}

function handleCircleClick(pageType, page) {
    if (pageType === 'Form') {
        window.open(`/api/resource/${page[1]}/${page[2]}`, "_blank");
    } else if (pageType === 'List') {
        const filters = cur_list.filter_area.get().map(each => ([each[1], each[2], each[3]]));
        const fieldsSelected = JSON.parse(localStorage.getItem(`${page[1]}_fields`) || '{}');
        const limit = parseInt(fieldsSelected['limit_frappe_developer_utils'] || '*') || '*';
        delete fieldsSelected['limit_frappe_developer_utils'];

        // Generate search URL
        const searchURL = new URL(`${window.location.origin}/api/resource/${page[1]}?fields=${JSON.stringify(getFieldsFromObject(fieldsSelected))}&limit=${limit}`);
        if (filters.length > 0) searchURL.searchParams.append('filters', JSON.stringify(filters));
        searchURL.searchParams.append('order_by', `${cur_list.sort_by} ${cur_list.sort_order}`);

        window.open(decodeURIComponent(searchURL.toString()), "_blank");
    }
}

function filterFields(fields) {
    const FIELD_TYPES_TO_EXCLUDE = ['Section Break', 'Column Break', 'Button', 'HTML', 'Fold', 'Heading', 'Table', 'Table MultiSelect', 'Tab Break'];
    return fields
        .filter(each => !FIELD_TYPES_TO_EXCLUDE.includes(each.fieldtype))
        .map(each => ({
            label: each.label || each.fieldname,
            fieldname: each.fieldname,
            fieldtype: 'Check',
        }));
}

function getFieldsFromObject(obj) {
    const fields = Object.keys(obj).filter(key => obj[key] === 1);
    fields.push('name');
    return fields;
}

function showLoading(show) {
    const loader = document.getElementById('custom-loader') || document.createElement('div');
    loader.id = 'custom-loader';
    loader.textContent = 'Loading...';
    loader.style.display = show ? 'flex' : 'none';
    if (!document.body.contains(loader)) {
        document.body.appendChild(loader);
    }
}

function componentLoader() {
    const page = frappe.get_route();

    if (!page || !['Form', 'List'].includes(page[0])) {
        document.getElementById('custom-ui-container')?.remove();
        return;
    }

    const { circleDiv, pencilDiv } = createCustomUI();
    addEventListeners(circleDiv, pencilDiv, page[0], page);
}

const throttledComponentLoader = _.throttle(componentLoader, 200);
frappe.router.on('change', throttledComponentLoader);
componentLoader();