import { h, createApp } from '@vue/runtime-dom';
import { isArray, isObject } from '../utils';

export function stepMount(domData) {
    const stepComp = createApp({
        render() {
            // stepRes
            return h('div', 
            domData.names.map((item) => {
                return h('div', {
                    className: 'res-row'
                }, 
                    [h('div', {
                        className: 'name'
                    }, item),
                        h('div', {
                            className: 'res'
                        },
                        isArray(domData.stepRes[item]) ? 
                        [
                            h('span', '['),
                            domData.stepRes[item].map((v,i) => {
                                let res; 
                                if(i === domData.stepRes[item].length - 1) {
                                    res = h('span', v);
                                } else {
                                    res = [h('span', v),h('span', ',')]
                                }
                                return res
                            }),
                            h('span', ']'),
                        ]
                        : isObject(domData.stepRes[item]) ?
                        JSON.stringify(domData.stepRes[item]) : 
                        domData.stepRes[item]
                    )]
                )
            })
            );
        }
    })
    stepComp.mount(document.getElementById('stepCont'));
}