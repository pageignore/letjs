
// 用于传递到js执行代码的全局响应式变量名
const GLOBALSTATE = 'LETJS_STATE';

/**
 * 代码中定义的变量集合
 */
export const variableSets = new Set();

/**
 * 通过js抽象语法树替换js代码中的变量为全局响应式对象引用
 * @param {Array} astBody js抽象语法树body
 * @param {Set} variableSets 变量名Set容器
 * @returns net ast 替换后的抽象语法树
 */
 export function transform(astNote , sets = variableSets) {
    if(!astNote) return;
    astNote = isNeedChange(astNote) ? valChange(astNote.name) : astNote;
    // 变量类型
    if(astNote.type === 'VariableDeclaration') {
        // 变量名 a; let a = '11'
        let name = astNote.declarations[0].id.name;
        // 同名 变量名后面加_
        if(sets.has(name)) {
            name += '_'; 
        }
        sets.add(name);
        // 变量的值
        let value = astNote.declarations[0].init;
        if(value.type === 'VariableDeclaration') {
            astNote = variableChange(name, value);
        } else {
            astNote = transform(value);
        }
        astNote = variableChange(name, value);
    }
    // 赋值表达式
    if(astNote.type === 'AssignmentExpression') {
        if(astNote.left) astNote.left = transform(astNote.left);
        if(astNote.right) astNote.right = transform(astNote.right);
    }
    if(astNote.type === 'CallExpression') {
        if(astNote.arguments) astNote.arguments = astNote.arguments.map(item => transform(item, sets));
        if(astNote.callee) astNote.callee = transform(astNote.callee);
    }
    // return 语句
    if(astNote.type === 'ReturnStatement') {
        // astNote = returnChange(astNote)
        if(isNeedChange(astNote.argument)) {
            astNote.argument = valChange(astNote.argument.name)
        } else {
            if(astNote.argument.left) astNote.argument.left = transform(astNote.argument.left);
            if(astNote.argument.right) astNote.argument.right = transform(astNote.argument.right);
        }
        
    }
    // 属性操作符
    if(astNote.type === 'MemberExpression') {
        if(astNote.object.type === 'Identifier'
         && variableSets.has(astNote.object.name)) {
            astNote.object = valChange(astNote.object.name);
         }
    }

    // 表达式
    if(astNote.type === 'ExpressionStatement') {
        if(astNote.expression) astNote.expression = transform(astNote.expression);
    }

    // if语句 三元运算符
    if(astNote.type === 'IfStatement' || astNote.type === 'ConditionalExpression') {
        astNote.test = transform(astNote.test);
        if(astNote.consequent) astNote.consequent = transform(astNote.consequent);
        if(astNote.alternate) astNote.alternate = transform(astNote.alternate);
    }

    //逻辑表达式
    if(astNote.type === 'LogicalExpression') {
        if(astNote.left) astNote.left = transform(astNote.left);
        if(astNote.right) astNote.right = transform(astNote.right);
    }

    if(astNote.type === 'BinaryExpression') {
        if(astNote.left) astNote.left = transform(astNote.left);
        if(astNote.right) astNote.right = transform(astNote.left);
    }

    // 函数体继续寻找变量
    if(astNote.type === 'FunctionDeclaration') {
        astNote.body.body = astNote.body.body.map(item => transform(item, sets));
    }
    // 循环体
    if(astNote.type === 'WhileStatement') {
        astNote.test = transform(astNote.test);
        astNote.body.body = astNote.body.body.map(item => transform(item, sets));
    }
    if(astNote.type === 'BlockStatement') {
        if(astNote.body) astNote.body = astNote.body.map(item => transform(item, sets));
    }
    if(astNote.type === 'Program') {
        astNote.body = astNote.body.map(item => transform(item, sets));
    }
    return astNote;
}

/**
 * js执行代码顶部添加全局响应式变量引用定义
 * const LETJS_STATE = this;
 * 
 * @param {*} ast 抽象语法树
 * @returns 返回添加了全局state变量的抽象语法树
 */
 export function unshiftStateCode(ast) {
    if(!ast || ast.type != 'Program') return;
    // 头部添加全局变量用于绑定响应式数据
    // const LETJS_STATE = this;
    let codeNode = {
        type: 'VariableDeclaration',
        declarations: [
            {
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name: GLOBALSTATE
                },
                init: {
                    type: 'ThisExpression'
                }
            }
        ],
        kind: "const"
    }
    ast.body.unshift(codeNode);
    return ast;
}

/**
 * 变量定义语句替换
 * @param {*} name 
 * @param {*} value 
 * @returns 
 */
function variableChange(name, value) {
    // 值为变量类型替换， 值为字面定义则不需要处理
    if(isNeedChange(value)) {
        value = valChange(value.name);
    }
    let node = {
        type: 'ExpressionStatement',
        expression:{
            type: 'AssignmentExpression',
            operator: '=',
            left: valChange(name),
            right: value
        }
    }
    return node;
}

/**
 * 替换变量节点
 * @param {*} node 变量名称
 * @returns 
 */
function valChange(name) {
    return {
        type: 'MemberExpression',
        computed:false,
        object:{
            type: 'Identifier',
            name: GLOBALSTATE
        },
        property:{
            type: 'Identifier',
            name
        }
    }
}

/**
 * 判断节点是否需要替换
 * @param {*} node 
 * @returns 
 */
function isNeedChange(node) {
    // 如果是变量类型，且是通过定义的变量，非函数传参
    return node.type === 'Identifier' && variableSets.has(node.name);
}