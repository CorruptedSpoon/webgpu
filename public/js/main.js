const main  = async () => {
    const adapter = await navigator.gpu?.requestAdapter();
    const device =  await adapter?.requestDevice();
    if(!device) {
        console.error('WebGPU not supported or enabled. Maybe you need to enable flags in your browser.');
        return;
    }
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({device, format: presentationFormat});

    const shaderModule = device.createShaderModule({
        label: 'basic red triangle',
        code: `
            @vertex fn vs(
                @builtin(vertex_index) vertexIndex : u32
            ) -> @builtin(position) vec4f {
                let pos = array(
                    vec2f(0.0, 0.5), // top center
                    vec2f(-0.5, -0.5), // bottom left
                    vec2f(0.5, -0.5) // bottom right
                );
                return vec4f(pos[vertexIndex], 0.0, 1.0);
            }

            @fragment fn fs() -> @location(0) vec4f {
                return vec4f(1.0, 0.0, 0.0, 1.0);
            }
        `
    });

    const pipeline = device.createRenderPipeline({
        label: 'basic red triangle pipeline',
        layout: 'auto',
        vertex: {
            entryPoint: 'vs',
            module: shaderModule
        },
        fragment: {
            entryPoint: 'fs',
            module: shaderModule,
            targets: [{ format: presentationFormat }]
        }
    });

    const renderPassDescriptor = {
        label: 'basic canvas render pass',
        colorAttachments: [
            {
                // view: <- to be filled in by the render loop
                clearValue: [0.0, 0.0, 1.0, 1],
                loadOp: 'clear',
                storeOp: 'store'
            }
        ]
    }

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view =
            context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder({ label: 'basic encoder' });
        
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.draw(3);
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    const observer = new ResizeObserver(() => {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        render();
    });

    observer.observe(canvas);
}

main();