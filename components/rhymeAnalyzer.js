/**
 * 押韵方式分析器模块
 * 负责识别和分类多种押韵方式，输出详细的押韵分析结果
 */

/**
 * 生成韵脚组序列的字符串表示
 * @param {Array<string>} sequence - 韵脚组序列
 * @returns {string} 序列的字符串表示
 */
function getSequenceKey(sequence) {
    return sequence.join('_');
}

/**
 * 提取所有可能的韵脚组序列
 * @param {Array<Object>} rhymeGroups - 韵脚组序列
 * @returns {Array<Object>} 所有可能的韵脚组序列信息
 */
function extractAllRhymeSequences(rhymeGroups) {
    const allSequences = [];
    
    // 遍历每一行
    rhymeGroups.forEach((group, lineIndex) => {
        const charInfos = group.charInfos;
        const maxLength = charInfos.length;
        
        // 提取所有可能的序列（从1字到整行）
        for (let startIndex = 0; startIndex < maxLength; startIndex++) {
            // 从startIndex开始，生成所有可能的序列
            for (let endIndex = startIndex; endIndex < maxLength; endIndex++) {
                const sequenceLength = endIndex - startIndex + 1;
                const isEndOfLine = endIndex === maxLength - 1;
                
                // 提取韵脚组序列
                const rhymeSequence = [];
                const chars = [];
                const pinyins = [];
                let hasUnknownRhyme = false;
                
                for (let i = startIndex; i <= endIndex; i++) {
                    const charInfo = charInfos[i];
                    const rhymeGroup = charInfo.normalGroup;
                    
                    if (rhymeGroup === '未知' || rhymeGroup === '') {
                        hasUnknownRhyme = true;
                        break;
                    }
                    
                    rhymeSequence.push(rhymeGroup);
                    chars.push(charInfo.char);
                    pinyins.push(charInfo.pinyin);
                }
                
                if (!hasUnknownRhyme) {
                    allSequences.push({
                        lineIndex,
                        startIndex,
                        endIndex,
                        length: sequenceLength,
                        sequence: rhymeSequence,
                        sequenceKey: getSequenceKey(rhymeSequence),
                        chars: chars,
                        pinyins: pinyins,
                        isEndOfLine: isEndOfLine,
                        // 计算序列的优先级分数
                        // 句尾序列优先级高（+1000），长序列优先级高（+length*10）
                        priorityScore: (isEndOfLine ? 1000 : 0) + sequenceLength * 10
                    });
                }
            }
        }
    });
    
    // 按优先级分数降序排列，确保句尾序列和长序列优先匹配
    return allSequences.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * 检查两个序列是否在行差容差以内
 * @param {Object} seq1 - 第一个序列
 * @param {Object} seq2 - 第二个序列
 * @param {number} tolerance - 行差容差
 * @returns {boolean} 是否在行差容差以内
 */
function isWithinFourLines(seq1, seq2, tolerance = 4) {
    const lineDiff = Math.abs(seq2.lineIndex - seq1.lineIndex);
    return lineDiff <= tolerance;
}

/**
 * 检查序列是否已经被标记过
 * @param {Object} seq - 要检查的序列
 * @param {Set<string>} markedPositions - 已标记的位置集合
 * @returns {boolean} 是否已经被标记
 */
function isSequenceMarked(seq, markedPositions) {
    for (let i = seq.startIndex; i <= seq.endIndex; i++) {
        if (markedPositions.has(`${seq.lineIndex}-${i}`)) {
            return true;
        }
    }
    return false;
}

/**
 * 检查两个序列是否为非句尾句间押韵（不同句子，位置相近）
 * @param {Object} seq1 - 第一个序列
 * @param {Object} seq2 - 第二个序列
 * @returns {boolean} 是否为非句尾句间押韵
 */
function isNonEndInterLineRhyme(seq1, seq2, tolerance = 2) {
    // 必须是不同句子
    if (seq1.lineIndex === seq2.lineIndex) {
        return false;
    }
    
    // 都不是句尾序列
    if (seq1.isEndOfLine || seq2.isEndOfLine) {
        return false;
    }
    
    // 检查位置是否相近，容差由参数指定
    const posDiff = Math.abs(seq1.startIndex - seq2.startIndex);
    return posDiff <= tolerance;
}

/**
 * 检查句内押韵的间隔是否符合要求
 * @param {Object} seq1 - 第一个序列
 * @param {Object} seq2 - 第二个序列
 * @returns {boolean} 间隔是否符合要求
 */
function isInternalRhymeValid(seq1, seq2, tolerance = 0) {
    // 只有当两个序列在同一行时，才需要检查间隔
    if (seq1.lineIndex !== seq2.lineIndex) {
        return true;
    }
    
    // 计算两个序列之间的间隔词数
    const start1 = seq1.startIndex;
    const end1 = seq1.endIndex;
    const start2 = seq2.startIndex;
    const end2 = seq2.endIndex;
    
    // 计算间隔词数
    let interval = 0;
    if (end1 < start2) {
        // 序列1在序列2前面
        interval = start2 - end1 - 1;
    } else if (end2 < start1) {
        // 序列2在序列1前面
        interval = start1 - end2 - 1;
    } else {
        // 序列重叠，间隔为0
        interval = 0;
    }
    
    // 间隔词数必须小于等于押韵数 + 额外容差（取两个序列中的较小长度）
    const rhymeCount = Math.min(seq1.length, seq2.length);
    return interval <= rhymeCount + tolerance;
}

/**
 * 标记序列位置为已使用
 * @param {Object} seq - 要标记的序列
 * @param {Set<string>} markedPositions - 已标记的位置集合
 */
function markSequencePositions(seq, markedPositions) {
    for (let i = seq.startIndex; i <= seq.endIndex; i++) {
        markedPositions.add(`${seq.lineIndex}-${i}`);
    }
}

/**
 * 分析押韵方式，识别多种押韵模式（支持双押、三押、多押）
 * @param {Array<Object>} rhymeGroups - 韵脚组序列
 * @returns {Object} 包含所有押韵分析结果的对象
 * @throws {Error} 输入验证失败时抛出错误
 */
export function analyzeRhymePatterns(rhymeGroups, options = {}) {
    // 输入验证
    if (!Array.isArray(rhymeGroups)) {
        throw new Error('输入必须是韵脚组序列数组');
    }
    
    if (rhymeGroups.length === 0) {
        return {
            rhymeGroups: [],
            analysisResults: [],
            summary: {
                totalLines: 0,
                totalRhymeCount: 0,
                rhymeTypes: {
                    endRhyme: 0,
                    internalRhyme: 0
                }
            }
        };
    }
    
    // 验证每个韵脚组的结构
    for (const group of rhymeGroups) {
        if (typeof group !== 'object' || group === null || 
            typeof group.line !== 'string' || !Array.isArray(group.charInfos)) {
            throw new Error('韵脚组序列格式无效');
        }
        
        for (const charInfo of group.charInfos) {
            if (typeof charInfo !== 'object' || charInfo === null || 
                typeof charInfo.char !== 'string' || typeof charInfo.pinyin !== 'string' ||
                typeof charInfo.normalGroup !== 'string' || typeof charInfo.strictGroup !== 'string') {
                throw new Error('韵脚组字符信息格式无效');
            }
        }
    }
    
    // 获取检测选项，设置默认值
    const {
        detectEndRhyme = true,
        detectInterLineRhyme = true,
        detectInternalRhyme = true,
        interLineTolerance = 2,
        interLineLineDiffTolerance = 4,
        internalRhymeTolerance = 0
    } = options;
    
    // 1. 提取所有可能的韵脚组序列
    const allSequences = extractAllRhymeSequences(rhymeGroups);
    
    // 2. 用于记录已标记的位置，避免重复标记
    const markedPositions = new Set();
    
    // 3. 收集所有可能的押韵匹配
    const allPossibleMatches = [];
    
    // 遍历所有序列对，收集所有可能的匹配
    for (let i = 0; i < allSequences.length; i++) {
        const seq1 = allSequences[i];
        
        for (let j = i + 1; j < allSequences.length; j++) {
            const seq2 = allSequences[j];
            
            // 检查是否在行差容差以内
            if (!isWithinFourLines(seq1, seq2, interLineLineDiffTolerance)) {
                continue;
            }
            
            // 检查序列是否相同
            if (seq1.sequenceKey === seq2.sequenceKey) {
                // 计算间隔
                let interval = 0;
                let rhymeType = '';
                let isValid = false;
                let priority = 0;
                
                // 1. 句尾押韵：至少有一个是句尾序列
                if (detectEndRhyme && (seq1.isEndOfLine || seq2.isEndOfLine)) {
                    rhymeType = `${seq1.length}字句尾押韵`;
                    // 句尾押韵，间隔计算为行差
                    interval = Math.abs(seq1.lineIndex - seq2.lineIndex);
                    // 优先级：句尾押韵最高
                    priority = 1000 - interval;
                    isValid = true;
                }
                // 2. 非句尾句间押韵：不同句子，位置相近，都不是句尾
                else if (detectInterLineRhyme && seq1.lineIndex !== seq2.lineIndex) {
                    // 检查是否为重复的字
                    const chars1 = seq1.chars.join('');
                    const chars2 = seq2.chars.join('');
                    
                    // 如果是完全相同的字，跳过（不判断重复的字）
                    if (chars1 === chars2) {
                        continue;
                    }
                    
                    // 句间押韵，计算位置差异（正向和反向）
                    const line1Length = rhymeGroups[seq1.lineIndex].charInfos.length;
                    const line2Length = rhymeGroups[seq2.lineIndex].charInfos.length;
                    
                    // 正向位置（从句首往后数）
                    const forwardDiff = Math.abs(seq1.startIndex - seq2.startIndex);
                    
                    // 反向位置（从句尾往前数）
                    const reverse1 = line1Length - 1 - seq1.endIndex;
                    const reverse2 = line2Length - 1 - seq2.endIndex;
                    const reverseDiff = Math.abs(reverse1 - reverse2);
                    
                    // 取正向和反向位置差异的较小值
                    interval = Math.min(forwardDiff, reverseDiff);
                    
                    if (interval <= interLineTolerance) {
                        rhymeType = `${seq1.length}字非句尾句间押韵`;
                        // 优先级：句间押韵次之
                        priority = 500 - interval;
                        isValid = true;
                    }
                }
                // 3. 句内押韵：同一行，间隔符合要求
                else if (detectInternalRhyme && seq1.lineIndex === seq2.lineIndex) {
                    // 句内押韵，计算字符间隔
                    const start1 = seq1.startIndex;
                    const end1 = seq1.endIndex;
                    const start2 = seq2.startIndex;
                    const end2 = seq2.endIndex;
                    
                    if (end1 < start2) {
                        interval = start2 - end1 - 1;
                    } else if (end2 < start1) {
                        interval = start1 - end2 - 1;
                    } else {
                        interval = 0;
                    }
                    
                    if (isInternalRhymeValid(seq1, seq2, internalRhymeTolerance)) {
                        rhymeType = `${seq1.length}字句内押韵`;
                        // 优先级：句内押韵最低
                        priority = 100 - interval;
                        isValid = true;
                    }
                }
                
                if (isValid) {
                    // 计算序列长度优先级（长序列优先）
                    const lengthPriority = seq1.length * 10;
                    
                    // 总优先级 = 类型优先级 + 长度优先级
                    const totalPriority = priority + lengthPriority;
                    
                    allPossibleMatches.push({
                        seq1: seq1,
                        seq2: seq2,
                        rhymeType: rhymeType,
                        interval: interval,
                        priority: totalPriority,
                        sequenceLength: seq1.length,
                        sequence: seq1.sequence,
                        sequenceKey: seq1.sequenceKey
                    });
                }
            }
        }
    }
    
    // 4. 按照优先级从高到低排序所有匹配
    allPossibleMatches.sort((a, b) => b.priority - a.priority);


    // 5. 按照优先级从高到低标记押韵，确保每个位置只被标记一次
    const analysisResults = [];
    let endRhymeCount = 0;
    let internalRhymeCount = 0;
    
    for (const match of allPossibleMatches) {
        const { seq1, seq2, rhymeType } = match;
        
        // 检查两个序列是否都未被标记
        if (!isSequenceMarked(seq1, markedPositions) && !isSequenceMarked(seq2, markedPositions)) {
            // 生成押韵结果
            const rhymeResult = {
                type: rhymeType.toLowerCase().replace(/\s+/g, '_'),
                rhymeType: rhymeType,
                rhymeGroup: match.sequence[0], // 使用第一个韵脚组作为代表
                sequenceLength: match.sequenceLength,
                sequence: match.sequence,
                positions: [
                    { line: seq1.lineIndex, char: seq1.startIndex, length: seq1.length },
                    { line: seq2.lineIndex, char: seq2.startIndex, length: seq2.length }
                ],
                chars: [seq1.chars, seq2.chars],
                pinyins: [seq1.pinyins, seq2.pinyins],
                similarity: 1.0
            };
            
            analysisResults.push(rhymeResult);
            
            // 更新计数
            if (rhymeType.includes('句尾')) {
                endRhymeCount++;
            } else {
                internalRhymeCount++;
            }
            
            // 标记两个序列的位置为已使用
            markSequencePositions(seq1, markedPositions);
            markSequencePositions(seq2, markedPositions);
        }
    }
    
    // 4. 为每个韵脚分配唯一ID和颜色
    const colorPalette = [
        "#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#FFC300",
        "#C70039", "#900C3F", "#581845", "#1ABC9C", "#3498DB"
    ];
    const rhymeGroupColors = new Map();
    let colorIndex = 0;
    
    const finalResults = analysisResults.map((result, index) => {
        // 为韵脚组序列分配颜色
        const sequenceKey = getSequenceKey(result.sequence);
        if (!rhymeGroupColors.has(sequenceKey)) {
            rhymeGroupColors.set(sequenceKey, colorPalette[colorIndex % colorPalette.length]);
            colorIndex++;
        }
        
        return {
            id: `rhyme_${String(index + 1).padStart(3, '0')}`,
            ...result,
            color: rhymeGroupColors.get(sequenceKey)
        };
    });
    
    // 5. 生成分析摘要
    const summary = {
        totalLines: rhymeGroups.length,
        totalRhymeCount: finalResults.length,
        rhymeTypes: {
            endRhyme: endRhymeCount,
            internalRhyme: internalRhymeCount
        }
    };
    
    return {
        rhymeGroups: rhymeGroups,
        analysisResults: finalResults,
        summary: summary
    };
}

