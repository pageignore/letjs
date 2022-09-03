
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
 export function transform(astBody , sets = variableSets) {
    if(!astBody) return;
    astBody = astBody.map(item => {
        // 变量类型
        if(item.type === 'VariableDeclaration') {
            // 变量名 a; let a = '11'
            let name = item.declarations[0].id.name;
            // 同名 变量名后面加_
            if(sets.has(name)) {
                name += '_'; 
            }
            sets.add(name);
            // 变量的值
            let value = item.declarations[0].init;
            item = variableChange(name, value);
        }
        // 表达式
        if(item.type === 'ExpressionStatement') {
            item = expressionChange(item);
        }
        // return 语句
        if(item.type === 'ReturnStatement') {
            item = returnChange(item);
        }
        // 函数体继续寻找变量
        if(item.type === 'FunctionDeclaration') {
            item.body.body = transform(item.body.body, sets);
        }
        return item;
    })
    return astBody;
}

/**
 * js执行代码顶部添加全局响应式变量引用定义
 * const LETJS_STATE = this;
 * 
 * @param {*} ast 抽象语法树
 * @returns 返回添加了全局state变量的抽象语法树
 */
 export function unshiftStateCode(ast) {
    if(!ast) return;
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
    ast.unshift(codeNode);
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
 * 函数调用表达式中的参数替换变量
 * @param {*} node 
 * @returns 
 */
function expressionChange(node) {
    let expression = node.expression;
    let type = node.expression.type;
    // 函数调用表达式
    if(type === 'CallExpression') {
        expression = argumentsChange(expression);
    } else {
        // 赋值表达式的右边是函数调用表达式
        if(expression.right && expression.right.type === 'CallExpression') {
            expression.right = argumentsChange(expression.right);   
        } else {
            if(isNeedChange(expression.left)) {
                expression.left = valChange(expression.left.name);
            }
            if(isNeedChange(expression.right)) {
                expression.right = valChange(expression.right.name);
            }
        }
    }
    return node;
}

/**
 * 函数声明中的变量名称替换
 * @param {*} node 
 * @returns 
 */
function argumentsChange(node) {
    node.arguments = node.arguments.map(item => {
        if(isNeedChange(item)) {
            // 变量类型
            item = valChange(item.name);
        }
        return item;
    })
    return node;
}

/**
 * return 语句替换变量
 * @param {*} node 
 * @returns 
 */
function returnChange(node) {
    // return 返回值一个变量
    if(isNeedChange(node.argument)) {
        node.argument = valChange(node.argument.name)
    }
    // 多个操作操作 return a+b+c+5*6;
    if(node.argument.type === 'BinaryExpression') {
        node.arguments = binaryExpressionChange(node.argument);
    }
    return node;
}

/**
 * BinaryExpression 类型节点替换变量
 * @param {*} node 
 * @returns 
 */
 function binaryExpressionChange(node) {
    if(!node) return;
    node = isNeedChange(node) ? valChange(node.name) : node;
    if(node.left) node.left = binaryExpressionChange(node.left);
    if(node.right) node.right = binaryExpressionChange(node.right);
    return node;
}


/**
 * 替换变量节点
 * @param {*} name 变量名称
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