#include <node.h>

namespace demo {
    using v8::FunctionCallbackInfo;
    using v8::Isolate;
    using v8::Local;
    using v8::NewStringType;
    using v8::Object;
    using v8::String;
    using v8::Value;

    unsigned int GetIdFromCode(std::string code) {
        unsigned int retVal = 0;
        for (unsigned int i = 0; i < 4; i++)
            retVal |= (unsigned int) ((char) (i < code.length() ? code[i] & 0xFF : 0x20) << (i * 8));
        return retVal;
    }

    std::string GetCodeFromId(unsigned int id) {
        char chars[4];
        for (int i = 0; i < 4; i++)
            chars[i] = (char) (char) (id >> (i * 8));
        return std::string(chars);
    }

    void Initialize(Local <Object> exports) {
        NODE_SET_METHOD(exports, "getIdFromCode", GetIdFromCode);
        NODE_SET_METHOD(exports, "GetCodeFromId", GetCodeFromId);
    }

    NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
}  // namespace demo
