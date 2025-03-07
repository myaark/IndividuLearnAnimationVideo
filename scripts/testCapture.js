const http = require('http');

async function testCapture() {
    try {
        console.log('Testing frame capture...');
        
        const response = await new Promise((resolve, reject) => {
            http.get('http://localhost:3000/capture', (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                });
                
            }).on('error', reject);
        });
        
        if (response.statusCode === 200) {
            console.log('✅ Frame capture successful');
            console.log('Check the frames/ directory for output');
        } else {
            console.log('❌ Frame capture failed');
            console.log('Status:', response.statusCode);
            console.log('Response:', response.data);
        }
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
    }
}

testCapture();