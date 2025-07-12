// Sistema de Notificaciones Freelance v2.0 - UI Components

class UIComponents {
    // Alert component
    static createAlert(type, message, container = null) {
        const alertElement = Utils.createElement('div', {
            className: `alert alert-${type}`,
            innerHTML: message
        });

        if (container) {
            container.appendChild(alertElement);
        }

        // Auto hide after 5 seconds
        setTimeout(() => {
            alertElement.remove();
        }, 5000);

        return alertElement;
    }

    // Modal component
    static createModal(title, content, options = {}) {
        const modal = Utils.createElement('div', {
            className: 'modal',
            style: 'display: block;'
        });

        const modalContent = Utils.createElement('div', {
            className: 'modal-content'
        });

        const modalHeader = Utils.createElement('div', {
            className: 'modal-header'
        });

        const modalTitle = Utils.createElement('h2', {
            textContent: title
        });

        const closeBtn = Utils.createElement('span', {
            className: 'close',
            innerHTML: '&times;'
        });

        const modalBody = Utils.createElement('div', {
            className: 'modal-body',
            innerHTML: content
        });

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);

        if (options.footer) {
            const modalFooter = Utils.createElement('div', {
                className: 'modal-footer',
                innerHTML: options.footer
            });
            modalContent.appendChild(modalFooter);
        }

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal handlers
        closeBtn.onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        return modal;
    }

    // Confirmation dialog
    static async confirm(message, title = 'Confirmación') {
        return new Promise((resolve) => {
            const modal = this.createModal(title, `
                <p>${message}</p>
            `, {
                footer: `
                    <button class="btn btn-danger" id="confirmBtn">Confirmar</button>
                    <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
                `
            });

            const confirmBtn = modal.querySelector('#confirmBtn');
            const cancelBtn = modal.querySelector('#cancelBtn');

            confirmBtn.onclick = () => {
                modal.remove();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                modal.remove();
                resolve(false);
            };
        });
    }

    // Pagination component
    static createPagination(currentPage, totalPages, onPageChange) {
        const pagination = Utils.createElement('div', {
            className: 'pagination'
        });

        const info = Utils.createElement('div', {
            className: 'pagination-info',
            textContent: `Página ${currentPage} de ${totalPages}`
        });

        const controls = Utils.createElement('div', {
            className: 'pagination-controls'
        });

        // Previous button
        const prevBtn = Utils.createElement('button', {
            className: 'pagination-btn',
            textContent: '‹ Anterior',
            disabled: currentPage === 1
        });
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                onPageChange(currentPage - 1);
            }
        };

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = Utils.createElement('button', {
                className: `pagination-btn ${i === currentPage ? 'active' : ''}`,
                textContent: i.toString()
            });
            pageBtn.onclick = () => onPageChange(i);
            controls.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = Utils.createElement('button', {
            className: 'pagination-btn',
            textContent: 'Siguiente ›',
            disabled: currentPage === totalPages
        });
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
            }
        };

        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);

        pagination.appendChild(info);
        pagination.appendChild(controls);

        return pagination;
    }

    // Data table component
    static createDataTable(data, columns, options = {}) {
        const table = Utils.createElement('table', {
            className: 'data-table'
        });

        // Create header
        const thead = Utils.createElement('thead');
        const headerRow = Utils.createElement('tr');

        columns.forEach(column => {
            const th = Utils.createElement('th', {
                textContent: column.label || column.key
            });
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = Utils.createElement('tbody');

        if (data.length === 0) {
            const noDataRow = Utils.createElement('tr');
            const noDataCell = Utils.createElement('td', {
                textContent: 'No hay datos disponibles',
                colSpan: columns.length,
                style: 'text-align: center; padding: 20px;'
            });
            noDataRow.appendChild(noDataCell);
            tbody.appendChild(noDataRow);
        } else {
            data.forEach(row => {
                const tr = Utils.createElement('tr');

                columns.forEach(column => {
                    const td = Utils.createElement('td');
                    
                    if (column.render) {
                        td.innerHTML = column.render(row[column.key], row);
                    } else {
                        const value = row[column.key] || '';
                        // Check if the value contains HTML tags
                        if (typeof value === 'string' && value.includes('<') && value.includes('>')) {
                            td.innerHTML = value;
                        } else {
                            td.textContent = value;
                        }
                    }

                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });
        }

        table.appendChild(tbody);

        return table;
    }

    // Filter component
    static createFilters(filters, onFilterChange) {
        const filtersContainer = Utils.createElement('div', {
            className: 'filters'
        });

        const filtersRow = Utils.createElement('div', {
            className: 'filters-row'
        });

        filters.forEach(filter => {
            const filterGroup = Utils.createElement('div', {
                className: 'filter-group'
            });

            const label = Utils.createElement('label', {
                textContent: filter.label
            });

            let input;
            if (filter.type === 'select') {
                input = Utils.createElement('select');
                
                // Add default option
                const defaultOption = Utils.createElement('option', {
                    value: '',
                    textContent: filter.placeholder || 'Todos'
                });
                input.appendChild(defaultOption);

                // Add options
                filter.options.forEach(option => {
                    const optionEl = Utils.createElement('option', {
                        value: option.value,
                        textContent: option.label
                    });
                    input.appendChild(optionEl);
                });
            } else {
                input = Utils.createElement('input', {
                    type: filter.type || 'text',
                    placeholder: filter.placeholder || ''
                });
            }

            input.addEventListener('change', (e) => {
                onFilterChange(filter.key, e.target.value);
            });

            filterGroup.appendChild(label);
            filterGroup.appendChild(input);
            filtersRow.appendChild(filterGroup);
        });

        // Add clear filters button
        const clearBtn = Utils.createElement('button', {
            className: 'btn btn-secondary btn-small',
            textContent: 'Limpiar Filtros'
        });
        clearBtn.onclick = () => {
            filtersRow.querySelectorAll('select, input').forEach(element => {
                element.value = '';
            });
            filters.forEach(filter => {
                onFilterChange(filter.key, '');
            });
        };

        filtersRow.appendChild(clearBtn);
        filtersContainer.appendChild(filtersRow);

        return filtersContainer;
    }

    // Search component
    static createSearch(placeholder = 'Buscar...', onSearch) {
        const searchContainer = Utils.createElement('div', {
            className: 'search-container'
        });

        const searchInput = Utils.createElement('input', {
            type: 'text',
            placeholder: placeholder,
            className: 'search-input'
        });

        const searchBtn = Utils.createElement('button', {
            className: 'btn btn-primary',
            textContent: '🔍 Buscar'
        });

        const debouncedSearch = Utils.debounce((value) => {
            onSearch(value);
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        searchBtn.onclick = () => {
            onSearch(searchInput.value);
        };

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchBtn);

        return searchContainer;
    }

    // Stats cards component
    static createStatsCards(stats) {
        const statsBar = Utils.createElement('div', {
            className: 'stats-bar'
        });

        stats.forEach(stat => {
            const statItem = Utils.createElement('div', {
                className: 'stat-item'
            });

            const statNumber = Utils.createElement('div', {
                className: 'stat-number',
                textContent: stat.value
            });

            const statLabel = Utils.createElement('div', {
                className: 'stat-label',
                textContent: stat.label
            });

            statItem.appendChild(statNumber);
            statItem.appendChild(statLabel);
            statsBar.appendChild(statItem);
        });

        return statsBar;
    }

    // Progress bar component
    static createProgressBar(value, max = 100, label = '') {
        const progressContainer = Utils.createElement('div', {
            className: 'progress-container'
        });

        const progressBar = Utils.createElement('div', {
            className: 'progress-bar'
        });

        const progress = Utils.createElement('div', {
            className: 'progress-fill',
            style: `width: ${(value / max) * 100}%`
        });

        const progressLabel = Utils.createElement('div', {
            className: 'progress-label',
            textContent: label || `${value}/${max}`
        });

        progressBar.appendChild(progress);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressLabel);

        return progressContainer;
    }

    // Notification toast
    static showToast(message, type = 'info', duration = 3000) {
        const toast = Utils.createElement('div', {
            className: `toast toast-${type}`,
            textContent: message,
            style: `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--${type}-color, #007bff);
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `
        });

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);

        return toast;
    }

    // Form validation
    static validateForm(form, rules) {
        const errors = {};
        
        Object.entries(rules).forEach(([fieldName, fieldRules]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            const value = field?.value?.trim() || '';
            
            fieldRules.forEach(rule => {
                if (rule.required && !value) {
                    errors[fieldName] = errors[fieldName] || [];
                    errors[fieldName].push(rule.message || 'Este campo es obligatorio');
                }
                
                if (rule.minLength && value.length < rule.minLength) {
                    errors[fieldName] = errors[fieldName] || [];
                    errors[fieldName].push(rule.message || `Mínimo ${rule.minLength} caracteres`);
                }
                
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors[fieldName] = errors[fieldName] || [];
                    errors[fieldName].push(rule.message || `Máximo ${rule.maxLength} caracteres`);
                }
                
                if (rule.pattern && !rule.pattern.test(value)) {
                    errors[fieldName] = errors[fieldName] || [];
                    errors[fieldName].push(rule.message || 'Formato inválido');
                }
                
                if (rule.email && !Utils.isValidEmail(value)) {
                    errors[fieldName] = errors[fieldName] || [];
                    errors[fieldName].push(rule.message || 'Email inválido');
                }
            });
        });

        return errors;
    }

    // Show form validation errors
    static showFormErrors(form, errors) {
        // Clear previous errors
        form.querySelectorAll('.field-error').forEach(error => error.remove());
        form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));

        // Show new errors
        Object.entries(errors).forEach(([fieldName, fieldErrors]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.classList.add('error');
                
                const errorDiv = Utils.createElement('div', {
                    className: 'field-error',
                    textContent: fieldErrors.join(', '),
                    style: 'color: #dc3545; font-size: 0.875rem; margin-top: 5px;'
                });
                
                field.parentNode.appendChild(errorDiv);
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
}