import './style.css';
import { reactive, effect, effectScope } from '@vue/reactivity';
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { getId, onClick, isArray, isObject } from './utils';
import { stepMount } from './component/step';
import { resMount } from './component/res';
import { insertionSort, codeStr5 } from './component/codeStr';
import { parseScript } from 'esprima';
import { generate } from 'escodegen';
import { variableSets, transform, unshiftStateCode } from './code';
// import transformer from './transform';

let autoPlayTimer = null;//自动播放动画定时器
let View = null;//代码编辑器

const isAuto = true; //是否自动播放变量变化

// 存储代码中变量数据
const state = reactive({
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
    if(domData.step >= stepData.data.length - 1) return;
    ++domData.step;
    setStep();
})

onClick('btnAuto', () => {
    console.log(autoPlayTimer)
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
    let docStr = getDocStr();
    // console.log(docStr, 'doc')
    let ast = parseScript(docStr);
    let astBody = ast && ast.body;
    let netAstBody = transform(astBody);
    console.log(netAstBody, 'netAstBody')
    console.log(variableSets, 'variableSets')
    netAstBody = unshiftStateCode(netAstBody);
    setStates(variableSets);
    let newAst = {
        type: 'Program',
        sourceType: 'script',
        body: netAstBody
    }
    // let newAst = transform(ast, variableSets);
    // console.log(a)
    let b = generate(newAst);
    console.log(b)
    let func = new Function(b)
    func.call(state, state)
    return
    // console.log(a);
    stop(); //每次运行停止之前的动画
    initData(); // 初始化数据
    let jscode = codeInit();
    console.log(jscode, 'jscode')
    try {
        let func = new Function(jscode)
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

// 通过编辑其获取代码字符串并完成响应式替换
function codeInit() {
    let docStr = getDocStr();
    return docStr;
    let varNames =  getVarNames(docStr);
    let fnNames = getFnNames(docStr);
    let newVarNames = resetVar(varNames);
    setState(newVarNames);
    return  replaceTemp(docStr, newVarNames, fnNames);
}

function getDocStr() {
    let docStr = '';
    const doc = View.state.doc;
    doc.text.forEach(t => {
        if(t[t.length - 1] != ';') {
            t+=';'
        }
        docStr += `${t}`
    });
    return docStr;
}

function codeEdotorInit() {
    View = new EditorView({
        doc: codeStr5,
        extensions: [basicSetup, javascript()],
        parent: document.getElementById('editor')
    })
}

function setStep() {
    // 程序正常运行 设置第一步的变量展示数据
    setStepData();
    // 设置当前步数数字展示
    setStepNumber();
    // 默认自动播放
}

function initData() {
    domData.names = [];
    domData.step = 0;
    stepData.data = [];
    domData.stepRes = {};
    variableSets.clear();
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


// 重新设置变量名。避免重名
function resetVar(varNames) {
    let res = [];
    const varSets = new Set();
    varNames.forEach(item => {
        if(varSets.has(item)) {
            item += '__';
        }
        varSets.add(item);
        res.push(item);
    })
    return res;
};

// 获取模板中定义的变量
function getVarNames(str) {
    let reg = /\b(var |let |const )\w+/g;
    return match(str)(reg);
}

// 获取模板中定义的函数
function getFnNames(str) {
    let reg = /\b(function )\w+/g;
    return match(str)(reg);
}

// 模板匹配
function match(str) {
    return function(reg)  {
        let res = [];
        let ret = str.match(reg)
        ret && ret.forEach(item => {
            let v = item.split(' ')[1];
            res.push(v)
        })
        return res;
    }
}

function setStates(sets) {
    for(let name of sets) {
        state[name] = null;
    }
}

function setState(varNames) {
    if(!varNames.length === 0) return null;
    varNames.forEach(item => {
        state[item] = null;
    })
    const scope = effectScope();
    scope.run(() => {
        varNames.forEach(item => {
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
        })
        
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


function replaceTemp(str, varNames, fnNames) {
    let varReg =  /\b(var |let |const )/g;
    let temp = str.replace(varReg, '');
    // 将变量指针改到state响应式数据
    varNames && varNames.forEach(item => {
        // let ret = item.replace(/_*$/g, '')
        temp = temp.replace(eval(`/\\b${item}\\b/g`), `this.${item}`);
    })
    // 替换模板函数，用于this指向state响应式数据
    fnNames && fnNames.forEach(item => {
        // 替换函数调用
        let useFn =  eval(`/\\b${item}\\(/g`);
        temp = temp.replace(useFn, `${item}.call(this,`);
        // 还原函数定义
        let defineFnReg =  eval(`/\\b[?!function ]+${item}.call\\(this[,]/g`);
        temp = temp.replace(defineFnReg, `function ${item}(`)
    })
    return temp;
}