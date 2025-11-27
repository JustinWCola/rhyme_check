// 生成韵脚映射表脚本
// 运行一次，将映射表固定成本地文件

const fs = require('fs');
const path = require('path');

// 读取押韵分组配置
const rhymeGroupsPath = path.join(__dirname, '../assets/rhyme-groups.json');
const rhymeGroups = JSON.parse(fs.readFileSync(rhymeGroupsPath, 'utf8'));

// 构建映射表
const rhymeMappings = {};

for (const [normalGroup, strictGroups] of Object.entries(rhymeGroups)) {
    for (const [strictGroup, finals] of Object.entries(strictGroups)) {
        finals.forEach(finial => {
            const trimmedFinial = finial.trim();
            rhymeMappings[trimmedFinial] = {
                normalGroup,
                strictGroup
            };
        });
    }
}

// 将映射表保存为本地文件
const outputPath = path.join(__dirname, '../assets/rhyme-mappings.json');
fs.writeFileSync(outputPath, JSON.stringify(rhymeMappings, null, 2), 'utf8');

console.log('韵脚映射表生成完成！');
console.log(`映射表已保存到: ${outputPath}`);
console.log(`共生成 ${Object.keys(rhymeMappings).length} 个韵脚映射`);
