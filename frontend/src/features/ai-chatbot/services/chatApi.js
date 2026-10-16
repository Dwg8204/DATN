import api from '../../../services/api';
export async function chatRequest(method,path,data,signal) {
  const response=await api.request({method,url:`/chatbot${path}`,data,signal,timeout:85000,notifyOnError:false});
  return response.data.data;
}
