# 镜水庭开发指南

本仓库是原生 HTML、CSS 和 JavaScript 的浏览器小游戏。上级目录中关于 MonsterTower、Godot 和 GDScript 的开发说明适用于另一个项目。镜水庭的运行和验证使用浏览器。

## 开发与构建

- `index.html`、`style.css`、`js/` 和 `assets/` 中的 WebP 是开发源文件。`index.html` 的 `#gameScripts` 定义经典脚本的加载顺序，`js/boot.js` 按顺序加载它们。脚本通过共享的顶层声明协作。
- 在仓库根目录运行 `python3 -m http.server 8000`，通过 `http://localhost:8000/` 打开开发入口。
- 修改页面、脚本、样式或 WebP 后，运行 `python3 build.py`。该脚本生成 `assets/textures.js`、`assets/specimens.js` 和 `镜水庭.html`。维护源文件并重新构建，避免手改生成文件。`镜水庭.html` 可直接在浏览器中离线打开。
- 用 `for file in js/*.js; do node --check "$file" || exit; done` 检查脚本语法。涉及互动或画面的改动，在浏览器里验证开发入口和离线版。游动相关改动应至少观察直游、转弯、低速和投喂时的表现。

## 代码与素材

- `js/species.js` 定义物种及行为类别，`js/model.js` 管理物种编号、贴图选择、生长和存档。物种编号保存在 `garden.fish[*].type`，编号 6–59 和 66–78 按编号读取 `assets/species/` 的数字贴图，60–65 已分配给池蛙、斑马螺和访客。丁鱥是 12 号，构建时使用 `assets/species/tench-dorsal.webp`。替换池内素材时也要检查 `sceneImage()` 是否为该物种选用了 `field-*.webp`。
- `js/pond.js` 的 `steer()` 计算移动和朝向，`poseFish()` 计算鱼身姿态，`drawFish()` 和 `drawContinuousBody()` 把鱼绘到 Canvas 2D。新鱼身素材采用正俯视，鱼头朝左、尾巴朝右，鱼身中轴保持水平。`js/water.js` 处理 WebGL 水面效果，`js/pond.js` 提供 Canvas 2D 回退。
- `js/ecology.js` 处理蛙和访客，`js/pondlife.js` 处理繁殖与池中杂物，`js/market.js` 处理鱼市与水域，`js/fieldnotes.js` 处理观察和手记。`js/ui.js` 管理界面显示，`js/game.js` 组装交互和启动动画循环。
- 存档使用浏览器 `localStorage`，主键为 `niwa.garden.v1`，备用槽为 `niwa.garden.v1.alternate`。测试旧档或构造指定物种时使用独立浏览器上下文，保留现有玩家存档。

## 提交与推送

完成每次修改并通过相关验证后，自动提交本次任务涉及的文件和对应构建产物，并将提交推送到当前分支的上游。用户明确要求暂缓提交或推送时，以该次指示为准。
