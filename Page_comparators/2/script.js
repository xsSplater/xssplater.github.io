// script.js
class PageComparator {
    constructor() {
        this.originalText = '';
        this.newText = '';
        this.changes = [];
        this.currentChangeIndex = -1;
        this.settings = {
            ignoreWhitespace: true,
            ignoreCase: false,
            theme: 'light'
        };
        
        this.initializeElements();
        this.loadSettings();
        this.loadSavedVersions();
        this.attachEventListeners();
        this.updateStats();
    }

    initializeElements() {
        // Input elements
        this.urlInput = document.getElementById('urlInput');
        this.originalContent = document.getElementById('originalContent');
        this.newContent = document.getElementById('newContent');
        
        // Buttons
        this.fetchBtn = document.getElementById('fetchBtn');
        this.saveOriginalBtn = document.getElementById('saveOriginalBtn');
        this.compareBtn = document.getElementById('compareBtn');
        this.clearNewBtn = document.getElementById('clearNewBtn');
        this.themeToggle = document.getElementById('themeToggle');
        
        // Navigation
        this.navigationPanel = document.getElementById('navigationPanel');
        this.prevChangeBtn = document.getElementById('prevChangeBtn');
        this.nextChangeBtn = document.getElementById('nextChangeBtn');
        this.firstChangeBtn = document.getElementById('firstChangeBtn');
        this.changesCount = document.getElementById('changesCount');
        this.currentChange = document.getElementById('currentChange');
        
        // Views
        this.unifiedViewBtn = document.getElementById('unifiedViewBtn');
        this.splitViewBtn = document.getElementById('splitViewBtn');
        this.unifiedView = document.getElementById('unifiedView');
        this.splitView = document.getElementById('splitView');
        this.comparisonResult = document.getElementById('comparisonResult');
        this.originalSplitView = document.getElementById('originalSplitView');
        this.newSplitView = document.getElementById('newSplitView');
        
        // Settings
        this.ignoreWhitespace = document.getElementById('ignoreWhitespace');
        this.ignoreCase = document.getElementById('ignoreCase');
        this.versionSelector = document.getElementById('versionSelector');
        
        // Status
        this.originalStatus = document.getElementById('originalStatus');
        
        // Stats
        this.originalWords = document.getElementById('originalWords');
        this.originalChars = document.getElementById('originalChars');
        this.newWords = document.getElementById('newWords');
        this.newChars = document.getElementById('newChars');
    }

    attachEventListeners() {
        // Control buttons
        this.fetchBtn.addEventListener('click', () => this.fetchPage());
        this.saveOriginalBtn.addEventListener('click', () => this.saveOriginal());
        this.compareBtn.addEventListener('click', () => this.compareTexts());
        this.clearNewBtn.addEventListener('click', () => this.clearNewContent());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Navigation
        this.prevChangeBtn.addEventListener('click', () => this.navigateChange(-1));
        this.nextChangeBtn.addEventListener('click', () => this.navigateChange(1));
        this.firstChangeBtn.addEventListener('click', () => this.navigateToFirstChange());
        
        // View toggles
        this.unifiedViewBtn.addEventListener('click', () => this.switchView('unified'));
        this.splitViewBtn.addEventListener('click', () => this.switchView('split'));
        
        // Settings
        this.ignoreWhitespace.addEventListener('change', () => this.updateSettings());
        this.ignoreCase.addEventListener('change', () => this.updateSettings());
        this.versionSelector.addEventListener('change', () => this.loadVersion());
        
        // Text input events
        this.originalContent.addEventListener('input', () => this.updateStats());
        this.newContent.addEventListener('input', () => this.updateStats());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchPage();
        });
    }

    async fetchPage() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showStatus('Введите URL страницы', 'error');
            return;
        }

        this.showStatus('Загрузка страницы...', 'success');
        
        try {
            // Используем CORS proxy для обхода ограничений
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(proxyUrl + encodeURIComponent(url));
            
            if (!response.ok) {
                throw new Error(`Ошибка загрузки: ${response.status}`);
            }
            
            const html = await response.text();
            const text = this.extractTextFromHtml(html);
            
            this.newContent.value = text;
            this.updateStats();
            this.showStatus('Страница успешно загружена', 'success');
            
        } catch (error) {
            this.showStatus(`Ошибка загрузки: ${error.message}`, 'error');
            console.error('Fetch error:', error);
        }
    }

    extractTextFromHtml(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Удаляем ненужные элементы
        const scripts = tempDiv.getElementsByTagName('script');
        const styles = tempDiv.getElementsByTagName('style');
        const noscripts = tempDiv.getElementsByTagName('noscript');
        
        Array.from(scripts).forEach(script => script.remove());
        Array.from(styles).forEach(style => style.remove());
        Array.from(noscripts).forEach(noscript => noscript.remove());
        
        // Извлекаем текст и очищаем
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Удаляем лишние пробелы и переносы
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }

    saveOriginal() {
        const text = this.originalContent.value.trim();
        if (!text) {
            this.showStatus('Введите текст страницы', 'error');
            return;
        }

        this.originalText = this.cleanText(text);
        
        // Сохраняем версию в localStorage
        this.saveVersion(text);
        this.showStatus('Исходная версия сохранена!', 'success');
        this.updateStats();
    }

    saveVersion(content) {
        const versions = this.getSavedVersions();
        const timestamp = new Date().toISOString();
        const version = {
            id: timestamp,
            content: content,
            timestamp: timestamp,
            url: this.urlInput.value.trim(),
            wordCount: this.countWords(content),
            charCount: content.length
        };
        
        versions.unshift(version);
        if (versions.length > 20) versions.pop(); // Ограничиваем историю
        
        localStorage.setItem('pageCompare_versions', JSON.stringify(versions));
        this.updateVersionSelector();
    }

    getSavedVersions() {
        try {
            return JSON.parse(localStorage.getItem('pageCompare_versions')) || [];
        } catch {
            return [];
        }
    }

    loadSavedVersions() {
        this.updateVersionSelector();
    }

    updateVersionSelector() {
        const versions = this.getSavedVersions();
        this.versionSelector.innerHTML = '<option value="">Выберите версию...</option>';
        
        versions.forEach(version => {
            const date = new Date(version.timestamp).toLocaleString('ru-RU');
            const option = document.createElement('option');
            option.value = version.id;
            option.textContent = `${date} (${version.wordCount} слов) ${version.url ? `- ${version.url}` : ''}`;
            this.versionSelector.appendChild(option);
        });
    }

    loadVersion() {
        const versionId = this.versionSelector.value;
        if (!versionId) return;

        const versions = this.getSavedVersions();
        const version = versions.find(v => v.id === versionId);
        
        if (version) {
            this.originalContent.value = version.content;
            this.urlInput.value = version.url || '';
            this.originalText = this.cleanText(version.content);
            this.updateStats();
            this.showStatus('Версия загружена', 'success');
        }
    }

    compareTexts() {
        if (!this.originalText) {
            this.showStatus('Сначала сохраните исходную версию', 'error');
            return;
        }

        const newContent = this.newContent.value.trim();
        if (!newContent) {
            this.showStatus('Введите текст новой версии', 'error');
            return;
        }

        this.newText = this.cleanText(newContent);
        
        // Выполняем сравнение в Web Worker если доступен, иначе в основном потоке
        if (window.Worker) {
            this.compareWithWorker();
        } else {
            this.performComparison();
        }
    }

    performComparison() {
        const startTime = performance.now();
        
        const result = this.compareTextsAdvanced(this.originalText, this.newText);
        this.comparisonResult.innerHTML = result.html;
        
        this.changes = result.changes;
        this.currentChangeIndex = -1;
        
        this.updateNavigation();
        this.updateSplitViews();
        
        const endTime = performance.now();
        console.log(`Сравнение заняло: ${(endTime - startTime).toFixed(2)}ms`);
        
        this.showStatus(`Сравнение завершено! Найдено ${this.changes.length} изменений`, 'success');
        
        // Автопрокрутка к первому изменению
        if (this.changes.length > 0) {
            setTimeout(() => this.navigateToFirstChange(), 100);
        }
    }

    compareTextsAdvanced(oldText, newText) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');
        const changes = [];
        let html = '';
        
        // Простой алгоритм сравнения построчно
        let i = 0, j = 0;
        while (i < oldLines.length || j < newLines.length) {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[j] || '';
            
            if (oldLine === newLine) {
                // Линии идентичны
                html += this.escapeHtml(oldLine) + '\n';
                i++;
                j++;
            } else {
                // Поиск следующей совпадающей линии
                let nextMatchOld = -1;
                let nextMatchNew = -1;
                
                for (let k = i + 1; k < oldLines.length; k++) {
                    if (oldLines[k] === newLine) {
                        nextMatchOld = k;
                        break;
                    }
                }
                
                for (let k = j + 1; k < newLines.length; k++) {
                    if (newLines[k] === oldLine) {
                        nextMatchNew = k;
                        break;
                    }
                }
                
                if (nextMatchOld !== -1 && (nextMatchNew === -1 || nextMatchOld - i <= nextMatchNew - j)) {
                    // Удаленные линии
                    for (let k = i; k < nextMatchOld; k++) {
                        const changeId = changes.length;
                        html += `<div class="removed" data-change="${changeId}">${this.escapeHtml(oldLines[k])}</div>`;
                        changes.push({ type: 'removed', index: changeId, element: null });
                    }
                    i = nextMatchOld;
                } else if (nextMatchNew !== -1 && (nextMatchOld === -1 || nextMatchNew - j < nextMatchOld - i)) {
                    // Добавленные линии
                    for (let k = j; k < nextMatchNew; k++) {
                        const changeId = changes.length;
                        html += `<div class="added" data-change="${changeId}">${this.escapeHtml(newLines[k])}</div>`;
                        changes.push({ type: 'added', index: changeId, element: null });
                    }
                    j = nextMatchNew;
                } else {
                    // Замена линии
                    if (oldLine) {
                        const changeId = changes.length;
                        html += `<div class="removed" data-change="${changeId}">${this.escapeHtml(oldLine)}</div>`;
                        changes.push({ type: 'removed', index: changeId, element: null });
                        i++;
                    }
                    if (newLine) {
                        const changeId = changes.length;
                        html += `<div class="added" data-change="${changeId}">${this.escapeHtml(newLine)}</div>`;
                        changes.push({ type: 'added', index: changeId, element: null });
                        j++;
                    }
                }
            }
        }
        
        return { html, changes };
    }

    updateNavigation() {
        const hasChanges = this.changes.length > 0;
        this.navigationPanel.style.display = hasChanges ? 'block' : 'none';
        
        if (hasChanges) {
            this.changesCount.textContent = this.changes.length;
            this.currentChange.textContent = '0';
            
            // Обновляем состояния кнопок
            this.prevChangeBtn.disabled = true;
            this.nextChangeBtn.disabled = this.changes.length === 0;
            this.firstChangeBtn.disabled = this.changes.length === 0;
        }
    }

    navigateToFirstChange() {
        if (this.changes.length > 0) {
            this.currentChangeIndex = 0;
            this.highlightChange(this.currentChangeIndex);
        }
    }

    navigateChange(direction) {
        if (this.changes.length === 0) return;
        
        const newIndex = this.currentChangeIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.changes.length) {
            this.currentChangeIndex = newIndex;
            this.highlightChange(this.currentChangeIndex);
        }
    }

    highlightChange(index) {
        // Убираем предыдущее выделение
        document.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
        
        // Находим и выделяем текущее изменение
        const changeElement = document.querySelector(`[data-change="${index}"]`);
        if (changeElement) {
            changeElement.classList.add('highlighted');
            changeElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Обновляем навигацию
            this.currentChange.textContent = index + 1;
            this.prevChangeBtn.disabled = index === 0;
            this.nextChangeBtn.disabled = index === this.changes.length - 1;
        }
    }

    updateSplitViews() {
        this.originalSplitView.innerHTML = this.originalText.split('\n')
            .map(line => `<div>${this.escapeHtml(line)}</div>`)
            .join('');
            
        this.newSplitView.innerHTML = this.newText.split('\n')
            .map(line => `<div>${this.escapeHtml(line)}</div>`)
            .join('');
    }

    switchView(viewType) {
        // Обновляем активные кнопки
        this.unifiedViewBtn.classList.toggle('active', viewType === 'unified');
        this.splitViewBtn.classList.toggle('active', viewType === 'split');
        
        // Переключаем видимость
        this.unifiedView.classList.toggle('active', viewType === 'unified');
        this.splitView.classList.toggle('active', viewType === 'split');
    }

    cleanText(text) {
        let cleaned = text;
        
        if (this.settings.ignoreWhitespace) {
            cleaned = cleaned.replace(/\s+/g, ' ');
        }
        
        if (this.settings.ignoreCase) {
            cleaned = cleaned.toLowerCase();
        }
        
        return cleaned.trim();
    }

    updateStats() {
        const originalText = this.originalContent.value;
        const newText = this.newContent.value;
        
        this.originalWords.textContent = this.countWords(originalText);
        this.originalChars.textContent = originalText.length;
        this.newWords.textContent = this.countWords(newText);
        this.newChars.textContent = newText.length;
    }

    countWords(text) {
        return text.trim() ? text.split(/\s+/).length : 0;
    }

    clearNewContent() {
        this.newContent.value = '';
        this.updateStats();
        this.showStatus('Поле очищено', 'success');
    }

    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveSettings();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        this.themeToggle.textContent = this.settings.theme === 'light' ? '🌙 Тёмная тема' : '☀️ Светлая тема';
    }

    updateSettings() {
        this.settings.ignoreWhitespace = this.ignoreWhitespace.checked;
        this.settings.ignoreCase = this.ignoreCase.checked;
        this.saveSettings();
    }

    loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('pageCompare_settings'));
            if (saved) {
                this.settings = { ...this.settings, ...saved };
            }
        } catch (e) {
            console.warn('Не удалось загрузить настройки');
        }
        
        this.applySettings();
    }

    applySettings() {
        this.ignoreWhitespace.checked = this.settings.ignoreWhitespace;
        this.ignoreCase.checked = this.settings.ignoreCase;
        this.applyTheme();
    }

    saveSettings() {
        localStorage.setItem('pageCompare_settings', JSON.stringify(this.settings));
    }

    showStatus(message, type = 'success') {
        this.originalStatus.textContent = message;
        this.originalStatus.className = `status ${type}`;
        
        setTimeout(() => {
            this.originalStatus.textContent = '';
            this.originalStatus.className = 'status';
        }, 4000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    compareWithWorker() {
        // Резервный метод - используем основной поток
        this.performComparison();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new PageComparator();
});