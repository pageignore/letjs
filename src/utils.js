const getId = (id) => {
    return document.getElementById(id);
}
const onClick = (id, cb) => {
    let el = getId(id);
    el && el.addEventListener('click', cb);
}

const isType = (type) => {
    return (obj) => {
        return Object.prototype.toString.call(obj) === `[object ${type}]`
    }
}
const isArray = isType('Array');
const isNumber = isType('Number');
const isString = isType('String');
const isObject = isType('Object');
const isNull = isType('Null');
const isFunction = isType('Function');
const isUndefined = isType('Undefined');
const isSet = isType('Set');
const isMap = isType('Map');
const isSymbol = isType('Symbol');

export {
    getId,
    onClick,
    isArray,
    isNumber,
    isString,
    isObject,
    isNull,
    isFunction,
    isUndefined,
    isSet,
    isMap,
    isSymbol
}