import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

const packageDefinition=protoLoader.loadSync("proto/main.proto");
const protoDescriptor=grpc.loadPackageDefinition(packageDefinition);
const loadgen=protoDescriptor.main;

export const client=new loadgen.LoadGeneration(
    "localhost:50051",
    grpc.credentials.createInsecure()
)

// client.StartLoad({URL:"ws://localhost:8080/trade"},(err,response)=>{
//     if(err!==null){
//         console.log(err);
//     }
//     else{
//         console.log(response.Message);
//     }
// });
// client.StopLoad({Message:"Stop the test"},(err,response)=>{
//     if(err!==null){
//         console.log(err);
//     }
//     else{
//         console.log(response.Message);
//     }
// });