/**
 * 韵脚转换器模块
 * 负责将文本转换为包含拼音和韵脚组信息的数据结构
 */

// 韵脚映射表缓存
let rhymeMappings = {};
let isMappingsLoaded = false;

/**
 * 加载韵脚映射表
 * @returns {Promise<void>}
 * @throws {Error} 加载失败时抛出错误
 */
export async function loadRhymeMappings() {
    try {
        const response = await fetch('assets/rhyme-mappings.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        rhymeMappings = await response.json();
        isMappingsLoaded = true;
        console.log('韵脚映射表加载完成');
    } catch (e) {
        console.error('加载韵脚映射表失败:', e);
        throw new Error(`加载韵脚映射表失败: ${e.message}`);
    }
}

/**
 * 获取单个拼音的韵脚组信息
 * @param {string} pinyin - 单个汉字的拼音
 * @returns {Object} 包含normalGroup和strictGroup的韵脚组信息
 * @throws {Error} 当韵脚映射表未加载时抛出错误
 */
export function getRhymeInfo(pinyin) {
    if (!isMappingsLoaded) {
        throw new Error('韵脚映射表尚未加载完成，请先调用loadRhymeMappings()');
    }
    
    if (typeof pinyin !== 'string' || pinyin.trim() === '') {
        return { normalGroup: '未知', strictGroup: '未知' };
    }
    
    return rhymeMappings[pinyin.trim()] || { normalGroup: '未知', strictGroup: '未知' };
}

/**
 * 将文本转换为包含拼音和韵脚组信息的数据结构
 * @param {string} text - 要转换的文本，支持多行
 * @returns {Array<Object>} 转换后的韵脚组数据结构
 * @throws {Error} 输入验证失败或转换过程中出错时抛出错误
 * 
 * @example
 * // 输入
 * const text = '床前明月光\n疑是地上霜';
 * // 输出
 * [
 *   {
 *     line: '床前明月光',
 *     charInfos: [
 *       { char: '床', pinyin: 'chuang', normalGroup: 'ang', strictGroup: 'uang' },
 *       // ... 其他字的信息
 *     ]
 *   },
 *   // ... 其他行的信息
 * ]
 */
export function convertTextToRhymeGroups(text) {
    // 输入验证
    if (typeof text !== 'string') {
        throw new Error('输入必须是字符串类型');
    }
    
    if (text.trim() === '') {
        return [];
    }
    
    if (!isMappingsLoaded) {
        throw new Error('韵脚映射表尚未加载完成，请先调用loadRhymeMappings()');
    }
    
    try {
        // 从pinyinPro库获取pinyin函数
        const { pinyin } = pinyinPro;
        
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const rhymeInfo = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            const chars = trimmedLine.split('');
            const charInfos = [];
            
            // 转换每个字为拼音并获取韵脚组
            for (const char of chars) {
                // 获取字的完整拼音
                const fullPinyin = pinyin(char, { toneType: 'none', type: 'array' });
                const pinyinStr = fullPinyin.length > 0 ? fullPinyin[0] : '';
                
                // 获取韵脚组信息
                const groupInfo = getRhymeInfo(pinyinStr);
                
                charInfos.push({
                    char: char,
                    pinyin: pinyinStr,
                    normalGroup: groupInfo.normalGroup,
                    strictGroup: groupInfo.strictGroup
                });
            }
            
            rhymeInfo.push({
                line: trimmedLine,
                charInfos: charInfos
            });
        }
        
        return rhymeInfo;
    } catch (e) {
        console.error('拼音转换失败:', e);
        throw new Error(`拼音转换失败: ${e.message}`);
    }
}

/**
 * 验证韵脚组数据结构的有效性
 * @param {Array<Object>} rhymeGroups - 韵脚组数据结构
 * @returns {boolean} 数据结构是否有效
 */
export function validateRhymeGroups(rhymeGroups) {
    if (!Array.isArray(rhymeGroups)) {
        return false;
    }
    
    for (const group of rhymeGroups) {
        if (typeof group !== 'object' || group === null) {
            return false;
        }
        
        if (typeof group.line !== 'string' || !Array.isArray(group.charInfos)) {
            return false;
        }
        
        for (const charInfo of group.charInfos) {
            if (typeof charInfo !== 'object' || charInfo === null) {
                return false;
            }
            
            const requiredFields = ['char', 'pinyin', 'normalGroup', 'strictGroup'];
            for (const field of requiredFields) {
                if (typeof charInfo[field] !== 'string') {
                    return false;
                }
            }
        }
    }
    
    return true;
}