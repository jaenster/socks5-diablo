#include <napi.h>
#include "Samples/functionexample.h"
#include <windows.h>
#include <iostream>
#include <cstring>
#include <string>


Napi::Value InitD2(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    // Retrieve path from node, as it is the function parameter
    std::string path = Napi::String::String(info.Env(), info[0]);

    // Store the old current directory
    CHAR szPath[255] = {0};

    GetCurrentDirectory(MAX_PATH, szPath);

    std::string d2client_full_path = path + "\\D2Client.dll";

    HINSTANCE hGetProcDLL = LoadLibraryEx(d2client_full_path.c_str(), nullptr, LOAD_LIBRARY_AS_DATAFILE);
    if (!hGetProcDLL) {
        return Napi::String::New(env, d2client_full_path);
    }

    // Set current directory path to the d2 folder
    SetCurrentDirectory(path.c_str());

    return Napi::Number::New(env, 0);
}

Napi::Object InitD2Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
            "initD2", Napi::Function::New(env, InitD2)
    );
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {

    InitD2Init(env, exports);
    functionexample::Init(env, exports);
    return exports;
}

NODE_API_MODULE(testaddon, InitAll
)