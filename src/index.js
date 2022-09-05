import './style.css';
import { reactive, effect, effectScope } from '@vue/reactivity';
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { getId, onClick, isArray, isObject } from './utils';
import { stepMount } from './component/step';
import { resMount } from './component/res';
import { kmpSearch } from './component/codeStr';
import { parseScript } from 'esprima';
import { generate } from 'escodegen';
import { VARIABLESETS, transform, unshiftStateCode } from './code';

let autoPlayTimer = null;//自动播放动画定时器
let View = null;//代码编辑器

const isAuto = true; //是否自动播放变量变化

// 存储代码中变量数据
let state = reactive({
})

// 变量变化数据
const stepData = reactive({
    data: [[]],
})

// 页面渲染数据
const domData = reactive({
    names: [], //所有变量
    endRes: {}, //最终运行结果
    stepRes: reactive({}), //显示当前变化
    step: 0,//变化步数
    runTime: 0
})

codeEdotorInit();
resMount(domData)
stepMount(domData)

onClick('run', () => {
    run();
})

onClick('btnPrev', () => {
    if(domData.step === 0) return;
    --domData.step;
    setStep();
})

onClick('btnNext', () => {
    if(domData.step >= stepData.data.length - 1) {
        domData.step = 0;
    } else {
        ++domData.step;
    }
    setStep();
})

onClick('btnAuto', () => {
    if(autoPlayTimer) {
        stepStop();
    } else {
        autoStep();
        getId('btnAuto').innerText = '暂停播放';
    }
})

// ctrl+s 自动执行
document.onkeydown = (e) => {
    if(e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        run();
    }
}

function stepStop() {
    stop();
    getId('btnAuto').innerText = '自动播放';
}

function run() {
    stop(); //每次运行停止之前的动画
    initData(); // 初始化数据
    let jscodeStr = jscodeFromDoctext();
    let ast = parseScript(jscodeStr);
    let newAst = transform(ast);
    newAst = unshiftStateCode(newAst);
    setStates(VARIABLESETS);
    watchState();
    let letJsCode = generate(newAst);
    try {
        let func = new Function(letJsCode)
        func.call(state)
    } catch(e) {
        throw e;
    }
    // 去除数组数据前面的空值
    shiftEmptyData();
    // 程序正常运行 设置第一步的变量展示数据
    setStep();
    isAuto ? autoStep() : null; // 默认自动播放
}

//通过编辑其获取代码字符串并完成响应式替换
function jscodeFromDoctext() {
    let jscodeStr = '';
    const doc = View.state.doc;
    doc.text.forEach(t => {
        t = t.replace(/\/\/.*/g, '') // 删除注释 //开头 
        if(t[t.length - 1] != ';') {
            t += ';'
        }
        jscodeStr += `${t}`
    });
    return jscodeStr;
}

function codeEdotorInit() {
    View = new EditorView({
        doc: kmpSearch,
        extensions: [basicSetup, javascript()],
        parent: document.getElementById('editor')
    })
}

function initData() {
    state = reactive({});
    domData.names = [], //所有变量
    domData.endRes = {}, //最终运行结果
    domData.stepRes = reactive({}), //显示当前变化
    domData.step = 0,//变化步数
    domData.runTime = 0
    stepData.data = [];
    VARIABLESETS.clear();
}

function setStep() {
    // 程序正常运行 设置第一步的变量展示数据
    setStepData();
    // 设置当前步数数字展示
    setStepNumber();
    // 默认自动播放
}


function setStepData() {
    let step = domData.step;
    if(!stepData.data[step]) return;
    domData.stepRes[stepData.data[step]['name']] = stepData.data[step].val;
}

function setStepNumber() {
    document.getElementById('stepNumber').innerText = `${domData.step}/${stepData.data.length - 1}`;
}

function autoStep() {
    autoPlayTimer = setTimeout(() => {
        if(domData.step >= stepData.data.length - 1) {
            domData.step = 0
        } else {
            ++domData.step;  
        }
        setStep();
        autoStep();
        getId('btnAuto').innerText = '暂停播放';
    }, 1000);
}

function stop() {
    clearTimeout(autoPlayTimer);
    autoPlayTimer = null;
}

function setStates(sets) {
    for(let name of sets) {
        state[name] = null;
    }
}

function watchState() {
    const scope = effectScope();
    scope.run(() => {
        for(let item in state) {
            domData.names.push(item);
            effect(() => {
                let row = {
                    name: item,
                    val: null
                }
                if(isArray(state[item])) {
                    for(let index in state[item]) {
                        if(index == 0) {
                            row.val = [state[item][index]]; //每一步变化
                            domData.endRes[item] = [state[item][index]]; // 覆盖，直到最后结果
                        } else {
                            row.val.push(state[item][index]); //每一步变化
                            domData.endRes[item].push(state[item][index]);  // 覆盖，直到最后结果
                        }
                    }
                } else if(isObject(state[item])) {
                    row.val = {};
                    domData.endRes[item] = {};
                    for( let i in state[item]) {
                        row.val[i] = state[item][i]; //每一步变化
                        domData.endRes[item][i] = state[item][i];  // 覆盖，直到最后结果
                    }
                } else {
                    row.val = state[item]; //每一步变化
                    domData.endRes[item] = state[item];  // 覆盖，直到最后结果
                }
                stepData.data.push(row); //添加每一次变化的数据
            })
        }
        
    })
    setTimeout(() => {
        scope.stop();
    })
}

// 去除数组数据前面的空值
function shiftEmptyData() {
    stepData.data.forEach(item => {
        if(!item.val || item.val.length === 0) {
            stepData.data.shift()
        } else {
            return;
        }
    })
}
