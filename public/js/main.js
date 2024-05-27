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
        label: 'basic rgb triangle',
        code: /* wgsl */`
            struct VertexShaderOutput {
                @builtin(position) position : vec4f,
                @location(0) color: vec4f
            }

            @vertex fn vs(
                @builtin(vertex_index) vertexIndex : u32
            ) -> VertexShaderOutput {
                let pos = array(
                    vec2f(0.0, 0.5), // top center
                    vec2f(-0.5, -0.5), // bottom left
                    vec2f(0.5, -0.5) // bottom right
                );
                var color = array<vec4f, 3>(
                    vec4f(1.0, 1.0, 0.0, 1.0),
                    vec4f(0.0, 1.0, 1.0, 1.0),
                    vec4f(1.0, 0.0, 1.0, 1.0)
                );

                var vsOutput: VertexShaderOutput;
                vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
                vsOutput.color = color[vertexIndex];
                return vsOutput;
            }

            @fragment fn fs(fsInput: VertexShaderOutput) -> @location(0) vec4f {
                return fsInput.color;
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
                clearValue: [0.0, 0.0, 0.0, 1],
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