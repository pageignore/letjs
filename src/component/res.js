import { h, createApp } from '@vue/runtime-dom';
import { isArray, isObject } from '../utils';

export function resMount(domData) {
    const resComp = createApp({
        render() {
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
                        isArray(domData.endRes[item]) ? 
                        [
                            h('span', '['),
                            domData.endRes[item].map((v,i) => {
                                let res; 
                                if(i === domData.endRes[item].length - 1) {
                                    res = h('span', v);
                                } else {
                                    res = [h('span', v),h('span', ',')]
                                }
                                return res
                            }),
                            h('span', ']'),
                        ]
                        : isObject(domData.endRes[item]) ?
                        JSON.stringify(domData.endRes[item]) : 
                        domData.endRes[item]
                    )]
                )
            })
            );
        }
    })
    
    resComp.mount(document.getElementById('resCont'));
}