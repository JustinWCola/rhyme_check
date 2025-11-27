// 引入韵脚转换、分析和可视化模块
import { loadRhymeMappings, convertTextToRhymeGroups, validateRhymeGroups } from './components/rhymeConverter.js';
import { analyzeRhymePatterns } from './components/rhymeAnalyzer.js';
import { generateRhymeReport } from './components/rhymeVisualizer.js';

document.addEventListener('DOMContentLoaded', function() {
    // 页面加载时加载韵脚映射表
    loadRhymeMappings().catch(error => {
        console.error('初始化失败:', error);
        alert('韵脚检测工具初始化失败，请刷新页面重试');
    });
    
    const textInput = document.getElementById('poemInput');
    const visualizationElement = document.getElementById('visualizationResult');
    const mainContent = document.querySelector('.main-content');
    
    // 同步两个文本框高度的函数
    function syncTextAreaHeights() {
        // 检查是否为水平排列模式
        const isHorizontal = window.innerWidth > 768;
        if (isHorizontal) {
            // 先重置高度，以便正确计算滚动高度
            textInput.style.height = 'auto';
            visualizationElement.style.height = 'auto';
            
            // 获取两个元素的内容高度
            const inputHeight = textInput.scrollHeight;
            const resultHeight = visualizationElement.scrollHeight;
            
            // 设置相同的高度，取最大值
            const maxHeight = Math.max(inputHeight, resultHeight, 100); // 确保最小高度为100px
            textInput.style.height = maxHeight + 'px';
            visualizationElement.style.height = maxHeight + 'px';
        } else {
            // 垂直排列时，结果框保持自动高度
            visualizationElement.style.height = 'auto';
            
            // 输入框根据内容动态调整高度
            textInput.style.height = 'auto';
            const inputHeight = textInput.scrollHeight;
            textInput.style.height = Math.max(inputHeight, 100) + 'px';
        }
    }
    
    // 选项元素
    const detectInterLineRhyme = document.getElementById('detectInterLineRhyme');
    const detectInternalRhyme = document.getElementById('detectInternalRhyme');
    const interLineTolerance = document.getElementById('interLineTolerance');
    const interLineToleranceValue = document.getElementById('interLineToleranceValue');
    const interLineLineDiffTolerance = document.getElementById('interLineLineDiffTolerance');
    const interLineLineDiffToleranceValue = document.getElementById('interLineLineDiffToleranceValue');
    const internalRhymeTolerance = document.getElementById('internalRhymeTolerance');
    const internalRhymeToleranceValue = document.getElementById('internalRhymeToleranceValue');
    
    // 更新滑块显示值
    interLineTolerance.addEventListener('input', function() {
        interLineToleranceValue.textContent = this.value;
        updateAnalysis();
    });
    
    interLineLineDiffTolerance.addEventListener('input', function() {
        interLineLineDiffToleranceValue.textContent = this.value;
        updateAnalysis();
    });
    
    internalRhymeTolerance.addEventListener('input', function() {
        internalRhymeToleranceValue.textContent = this.value;
        updateAnalysis();
    });
    
    // 选项变化时更新分析
    detectInterLineRhyme.addEventListener('change', updateAnalysis);
    detectInternalRhyme.addEventListener('change', updateAnalysis);
    
    // 自动完成转换，当用户输入文本时自动进行转换
    textInput.addEventListener('input', updateAnalysis);
    
    // 更新分析结果
    function updateAnalysis() {
        const text = textInput.value.trim();
        if (!text) {
            visualizationElement.innerHTML = '<p>可视化结果将显示在这里...</p>';
            syncTextAreaHeights();
            return;
        }

        try {
            // 转换文本为韵脚组
            const rhymeGroups = convertTextToRhymeGroups(text);
            
            // 验证转换结果
            if (!validateRhymeGroups(rhymeGroups)) {
                throw new Error('韵脚转换结果无效');
            }
            
            // 获取当前选项，句尾押韵默认开启
            const options = {
                detectEndRhyme: true, // 句尾押韵默认开启
                detectInterLineRhyme: detectInterLineRhyme.checked,
                detectInternalRhyme: detectInternalRhyme.checked,
                interLineTolerance: parseInt(interLineTolerance.value),
                interLineLineDiffTolerance: parseInt(interLineLineDiffTolerance.value),
                internalRhymeTolerance: parseInt(internalRhymeTolerance.value)
            };
            
            // 分析押韵方式
            const rhymeAnalysis = analyzeRhymePatterns(rhymeGroups, options);
            
            // 生成可视化结果
            const visualizationHtml = generateRhymeReport(rhymeAnalysis);
            visualizationElement.innerHTML = visualizationHtml;
            
            // 同步高度
            syncTextAreaHeights();
        } catch (error) {
            console.error('处理失败:', error);
            visualizationElement.innerHTML = `<p class="error-message">处理失败: ${error.message}</p>`;
            syncTextAreaHeights();
        }
    }
    
    // 初始化调用一次，确保页面加载时高度正确
    syncTextAreaHeights();
    
    // 监听窗口大小变化，调整高度
    window.addEventListener('resize', syncTextAreaHeights);
    
    // 监听输入框内容变化，实时调整高度
    textInput.addEventListener('input', syncTextAreaHeights);
});