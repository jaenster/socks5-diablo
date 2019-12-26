let ffi = require('ffi-napi');
let ref = require('ref-napi');

// so we can all agree that a buffer with the int value written
// to it could be represented as an "int *"
var buf = new Buffer(4);
buf.writeInt32LE(12345, 0);

// first, what is the memory address of the buffer?
console.log(buf.hexAddress());  // ← '7FA89D006FD8'


// using `ref`, you can set the "type", and gain magic abilities!
buf.type = ref.types.int;

// now we can dereference to get the "meaningful" value
console.log(buf.deref());  // ← 12345


// you can also get references to the original buffer if you need it.
// this buffer could be thought of as an "int **"
var one = buf.ref();

// and you can dereference all the way back down to an int
console.log(one.deref().deref());  // ← 12345

//[DllImport("kernel32.dll")] static extern Boolean CreateProcess(String lpApplicationName, String lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, Boolean bInheritHandles, UInt32 dwCreationFlags, IntPtr lpEnvironment, String lpCurrentDirectory, ref STARTUP_INFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);