/**
 * 押韵可视化模块
 * 负责将押韵分析结果转换为可视化的HTML展示
 */

/**
 * 生成押韵分析结果的可视化HTML
 * @param {Object} analysisResult - 押韵分析结果
 * @returns {string} 可视化HTML字符串
 */
export function visualizeRhymePatterns(analysisResult) {
    // 输入验证
    if (!analysisResult || !analysisResult.rhymeGroups || !analysisResult.analysisResults) {
        return '<div class="visualization-error">无效的押韵分析结果</div>';
    }

    const { rhymeGroups, analysisResults } = analysisResult;
    let html = '<div class="rhyme-visualization">';

    // 为每个字符创建押韵标记映射
    const rhymeMarkers = createRhymeMarkers(rhymeGroups, analysisResults);

    // 生成可视化歌词
    html += '<div class="visualization-lyrics">';
    rhymeGroups.forEach((group, lineIndex) => {
        html += `<div class="visualization-line">`;
        
        group.charInfos.forEach((charInfo, charIndex) => {
            const char = charInfo.char;
            const markers = rhymeMarkers.get(`${lineIndex}-${charIndex}`) || [];
            
            if (markers.length > 0) {
                // 有押韵标记，使用带颜色的span和自定义悬浮窗
                const mainMarker = markers[0]; // 使用第一个标记的颜色
                const rhymeSequence = mainMarker.sequence.join(' '); // 押韵组序列，如"AN IN"
                
                // 计算连押字数
                const rhymeCount = mainMarker.sequenceLength;
                
                // 转换连押字数为中文
                const rhymeCountText = rhymeCount === 1 ? '单押' : rhymeCount === 2 ? '双押' : rhymeCount === 3 ? '三押' : `${rhymeCount}押`;
                
                html += `<div class="char-hover-container">`;
                html += `<span class="rhyme-word" style="color: ${mainMarker.color}; background-color: ${adjustColorOpacity(mainMarker.color, 0.2)}; border-bottom: 2px solid ${mainMarker.color};">${char}</span>`;
                html += `<div class="char-tooltip">`;
                html += `<div class="tooltip-content" style="border: 2px solid ${mainMarker.color}; --tooltip-border-color: ${mainMarker.color};">`;
                html += `<div class="tooltip-pinyin">${char} ${charInfo.pinyin}</div>`;
                html += `<div class="tooltip-groups">`;
                html += `<div class="normal-group" style="color: ${mainMarker.color}; background-color: ${adjustColorOpacity(mainMarker.color, 0.2)}; border: 1px solid ${mainMarker.color};">${rhymeSequence} ${rhymeCountText}</div>`;
                html += `</div>`;
                html += `</div>`;
                html += `</div>`;
                html += `</div>`;
            } else {
                // 无押韵标记，普通显示
                html += `<div class="char-hover-container">`;
                html += `<span class="normal-word">${char}</span>`;
                html += `<div class="char-tooltip">`;
                html += `<div class="tooltip-content" style="border: 2px solid var(--primary-color); --tooltip-border-color: var(--primary-color);">`;
                html += `<div class="tooltip-pinyin">${char} ${charInfo.pinyin}</div>`;
                html += `<div class="tooltip-groups">`;
                html += `<div class="normal-group">无押韵</div>`;
                html += `</div>`;
                html += `</div>`;
                html += `</div>`;
                html += `</div>`;
            }
        });
        
        html += `</div>`;
    });
    html += '</div>';

    // 生成简化的押韵统计信息（只显示押韵字词比例）
    html += generateSimpleStats(rhymeGroups, analysisResults);

    html += '</div>';
    return html;
}

/**
 * 创建押韵标记映射
 * @param {Array<Object>} rhymeGroups - 韵脚组序列
 * @param {Array<Object>} analysisResults - 押韵分析结果
 * @returns {Map<string, Array<Object>>} 押韵标记映射，键为"line-char"，值为标记数组
 */
function createRhymeMarkers(rhymeGroups, analysisResults) {
    const markers = new Map();
    
    analysisResults.forEach(result => {
        result.positions.forEach(pos => {
            // 处理多押序列，为序列中的每个字符创建标记
            const length = pos.length || 1;
            for (let i = 0; i < length; i++) {
                const charIndex = pos.char + i;
                const key = `${pos.line}-${charIndex}`;
                if (!markers.has(key)) {
                    markers.set(key, []);
                }
                markers.get(key).push(result);
            }
        });
    });
    
    return markers;
}

/**
 * 生成简化的押韵统计信息HTML（只显示押韵字词比例）
 * @param {Array<Object>} rhymeGroups - 韵脚组序列
 * @param {Array<Object>} analysisResults - 押韵分析结果
 * @returns {string} 简化的统计信息HTML字符串
 */
function generateSimpleStats(rhymeGroups, analysisResults) {
    // 计算总字符数
    let totalChars = 0;
    rhymeGroups.forEach(group => {
        totalChars += group.charInfos.length;
    });
    
    // 计算押韵字符数（去重）
    const rhymingChars = new Set();
    analysisResults.forEach(result => {
        result.positions.forEach(pos => {
            // 处理多押序列，为序列中的每个字符创建标记
            const length = pos.length || 1;
            for (let i = 0; i < length; i++) {
                const charIndex = pos.char + i;
                const key = `${pos.line}-${charIndex}`;
                rhymingChars.add(key);
            }
        });
    });
    const rhymingCharCount = rhymingChars.size;
    
    // 计算押韵比例
    const rhymeRatio = totalChars > 0 ? (rhymingCharCount / totalChars * 100).toFixed(1) : 0;
    
    let html = '<div class="rhyme-stats">';
    html += `<div class="stat-item">押韵字词比例: <span class="stat-value">${rhymeRatio}%</span></div>`;
    html += '</div>';
    return html;
}

/**
 * 生成完整的押韵分析报告HTML
 * @param {Object} analysisResult - 押韵分析结果
 * @returns {string} 完整的押韵分析报告HTML
 */
export function generateRhymeReport(analysisResult) {
    let html = '<div class="rhyme-report">';
    html += visualizeRhymePatterns(analysisResult);
    html += '</div>';
    return html;
}

/**
 * 调整颜色透明度
 * @param {string} color - 十六进制颜色值
 * @param {number} opacity - 透明度值(0-1)
 * @returns {string} 带透明度的RGBA颜色值
 */
function adjustColorOpacity(color, opacity) {
    // 解析十六进制颜色
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}